// Personal touches for the person the app was made for: her birthday and the greeting's words.
// The committed values are neutral placeholders. Release builds overwrite this file from the
// PERSONAL_CONFIG repository secret (scripts/personal-config.js), so nothing private lives in the repo.
export const PERSONAL = {
  /** 'MM-DD', or '' for no automatic birthday look. */
  birthday: '',
  /** { uk, de } overrides for the greeting's title, or null for the generic one. */
  title: null,
  /** { uk, de } closing line of the greeting, or null to leave it out. */
  love: null,
};
