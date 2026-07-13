import { beforeEach, describe, expect, test } from "vitest";

import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";

beforeEach(() => {
    useSshPassphraseStore.getState().close();
});

describe("SSH retry actions", () => {
    test("registers independent actions by key", () => {
        const store = useSshPassphraseStore.getState();
        const first = async () => {};
        const second = async () => {};

        store.setRetryAction("activity", first);
        store.setRetryAction("diff", second);
        expect(useSshPassphraseStore.getState().retryActions).toEqual({
            activity: first,
            diff: second,
        });

        store.setRetryAction("activity", null);
        expect(useSshPassphraseStore.getState().retryActions).toEqual({
            diff: second,
        });
        useSshPassphraseStore.getState().close();
    });

    test("replaces retry actions registered under the same key", () => {
        const first = async () => {};
        const replacement = async () => {};

        useSshPassphraseStore.getState().setRetryAction("activity", first);
        useSshPassphraseStore
            .getState()
            .setRetryAction("activity", replacement);

        expect(useSshPassphraseStore.getState().retryActions.activity).toBe(
            replacement,
        );
    });

    test("opens a prompt and clears every sensitive field when closed", () => {
        const request = {
            body: "payload",
            contentType: "application/json",
            method: "POST",
            url: "http://localhost/request",
        };
        const store = useSshPassphraseStore.getState();

        store.open(request);
        useSshPassphraseStore.getState().setPassphrase("secret");
        useSshPassphraseStore.getState().setError("wrong passphrase");
        useSshPassphraseStore.getState().setSaving(true);
        useSshPassphraseStore
            .getState()
            .setRetryAction("retry", async () => {});

        expect(useSshPassphraseStore.getState()).toMatchObject({
            error: "wrong passphrase",
            isOpen: true,
            isSaving: true,
            passphrase: "secret",
            pendingRequest: request,
        });

        useSshPassphraseStore.getState().close();

        expect(useSshPassphraseStore.getState()).toMatchObject({
            error: undefined,
            isOpen: false,
            isSaving: false,
            passphrase: "",
            pendingRequest: null,
            retryActions: {},
        });
    });

    test("opening a new request resets previous prompt state", () => {
        const store = useSshPassphraseStore.getState();
        store.setPassphrase("old");
        store.setError("old error");
        store.setSaving(true);

        store.open(null);

        expect(useSshPassphraseStore.getState()).toMatchObject({
            error: undefined,
            isOpen: true,
            isSaving: false,
            passphrase: "",
            pendingRequest: null,
            retryActions: {},
        });
    });
});
