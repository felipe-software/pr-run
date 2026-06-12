import { create } from "zustand";

export type PendingRequest = {
    url: string;
    method: string;
    body?: string;
    contentType?: string;
};

type SshPassphraseState = {
    error?: string;
    isOpen: boolean;
    isSaving: boolean;
    passphrase: string;
    pendingRequest: PendingRequest | null;
    retryAction: (() => Promise<void>) | null;
    close: () => void;
    open: (request: PendingRequest | null) => void;
    setError: (error?: string) => void;
    setPassphrase: (passphrase: string) => void;
    setRetryAction: (retryAction: (() => Promise<void>) | null) => void;
    setSaving: (isSaving: boolean) => void;
};

export const useSshPassphraseStore = create<SshPassphraseState>((set) => ({
    error: undefined,
    isOpen: false,
    isSaving: false,
    passphrase: "",
    pendingRequest: null,
    retryAction: null,
    close: () =>
        set({
            error: undefined,
            isOpen: false,
            isSaving: false,
            passphrase: "",
            pendingRequest: null,
            retryAction: null,
        }),
    open: (pendingRequest) =>
        set({
            error: undefined,
            isOpen: true,
            isSaving: false,
            passphrase: "",
            pendingRequest,
            retryAction: null,
        }),
    setError: (error) => set({ error }),
    setPassphrase: (passphrase) => set({ passphrase }),
    setRetryAction: (retryAction) => set({ retryAction }),
    setSaving: (isSaving) => set({ isSaving }),
}));
