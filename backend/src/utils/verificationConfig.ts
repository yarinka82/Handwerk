export const verificationConfig = {
  REGISTER: {
    template: 'confirm-email.html',
    useLink: true,
    useCode: true,
    url: "confirm"
  },

  LOGIN: {
    template: 'confirm-email.html',
    useLink: true,
    useCode: true,
    url: "confirm"
  },

  EMAIL_CONFIRM: {
    template: 'confirm-email.html',
    useLink: true,
    useCode: true,
    url: "confirm-email"
  },

  REQUEST_CONFIRM: {
    template: 'confirm-email.html',
    useLink: true,
    useCode: true,
    url: "confirm"
  },

  ORDER_CONFIRM: {
    template: 'confirm-email.html',
    useLink: true,
    useCode: false,
    url: "confirm"
  },

   PHONE_CONFIRM: {
    template: 'confirm-email.html',
    useLink: false,
    useCode: true,
    url: "confirm-email"
  },

  PASSWORD_CHANGE: {
    template: 'confirm-email.html',
    useLink: false,
    useCode: true,
    url: "confirm-password"
  },

  PASSWORD_RESET: {
    template: 'confirm-email.html',
    useLink: true,
    useCode: true,
     url: "confirm-password"
  },
};
