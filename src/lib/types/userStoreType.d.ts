export type UserStoreType = {
  user: {
    username: string;
    password: string;
  } | null;
  setUser: (value: { username: string; password: string }) => void;
  getUser: () => { username: string; password: string } | null;
};

export type User = {
  username: string;
  password: string;
};
