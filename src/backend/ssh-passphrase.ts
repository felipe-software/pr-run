let sshPassphrase = process.env.PR_RUN_SSH_PASSPHRASE ?? "";

export function getSshPassphrase() {
    return sshPassphrase;
}

export function setSshPassphrase(value: string) {
    sshPassphrase = value;
}

export function clearSshPassphrase() {
    sshPassphrase = "";
}
