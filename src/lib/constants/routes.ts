export const ROUTES = {
  home: "/",
  login: "/view/loginPage",
  authConfirm: "/api/auth/confirm",
  chatHome: "/view/chatPage",
  chatDetail: (chatId: string) => `/view/chatPage/${chatId}`,
} as const;
