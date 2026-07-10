import { describe, expect, test } from "bun:test";

import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";

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
});
