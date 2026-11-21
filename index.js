/**
 * Host half of the DeepSeek balance badge bundle. All work happens in the
 * Client module: the badge reads the shared account service (`accountUi`,
 * published by the built-in settings-account plugin) and calls
 * `remote.account.getBalance` with it. The Host half stays empty.
 */
export function apply() {}
