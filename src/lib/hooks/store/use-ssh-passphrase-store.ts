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
    retryActions: Record<string, () => Promise<void>>;
    close: () => void;
    open: (request: PendingRequest | null) => void;
    setError: (error?: string) => void;
    setPassphrase: (passphrase: string) => void;
    setRetryAction: (
        key: string,
        retryAction: (() => Promise<void>) | null,
    ) => void;
    setSaving: (isSaving: boolean) => void;
};

export const useSshPassphraseStore = create<SshPassphraseState>((set) => ({
    error: undefined,
    isOpen: false,
    isSaving: false,
    passphrase: "",
    pendingRequest: null,
    retryActions: {},
    close: () =>
        set({
            error: undefined,
            isOpen: false,
            isSaving: false,
            passphrase: "",
            pendingRequest: null,
            retryActions: {},
        }),
    open: (pendingRequest) =>
        set({
            error: undefined,
            isOpen: true,
            isSaving: false,
            passphrase: "",
            pendingRequest,
            retryActions: {},
        }),
    setError: (error) => set({ error }),
    setPassphrase: (passphrase) => set({ passphrase }),
    setRetryAction: (key, retryAction) =>
        set((state) => {
            const retryActions = { ...state.retryActions };

            if (retryAction) {
                retryActions[key] = retryAction;
            } else {
                delete retryActions[key];
            }

            return { retryActions };
        }),
    setSaving: (isSaving) => set({ isSaving }),
}));
