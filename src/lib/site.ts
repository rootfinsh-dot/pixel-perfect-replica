/**
 * Configuration des comptes de donateurs / partenaires
 * Ce fichier est utilisé pour les paiements et dons de la page de souscription.
 */

export const DONATE_ACCOUNTS = {
  paypal: {
    email: "dabalarbi@gmail.com",
  },
  redotpay: {
    uid: "1471439889",
    surname: "larbiou",
  },
} as const;

// Exports pour compatibilité avec le code existant
export const PAYPAL_EMAIL = DONATE_ACCOUNTS.paypal.email;
export const REDOTPAY_UID = DONATE_ACCOUNTS.redotpay.uid;
export const REDOTPAY_SURNAME = DONATE_ACCOUNTS.redotpay.surname;
