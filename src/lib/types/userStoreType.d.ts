export type UserStoreType = {
  user: {
    username: string;
    password: string;
  } | null;
  token: any; // token 属性
  setUser: (value: { username: string; password: string }) => void;
  getUser: () => { username: string; password: string } | null;
  setToken: (value: any) => void;
  getToken: () => any;
};

export type User = {
  username: string;
  password: string;
};
