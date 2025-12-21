import { immer } from "zustand/middleware/immer";
import { create } from "zustand";
import { createJSONStorage, devtools } from "zustand/middleware";
import { persist } from "zustand/middleware";

interface User {
  username: string;
  password: string;
}

interface UserState {
  user: User | null;
  setUser: (value: User) => void;
  getUser: () => User | null;
}

export const useUserStore = create<UserState>()(
  immer(
    devtools(
      persist(
        (set, get) => {
          return {
            user: null,
            setUser: (value: User) => {
              set((state: any) => {
                state.user = value;
              });
            },
            getUser: (): User | null => {
              return get().user;
            },
          };
        },
        {
          name: "userStore",
          storage: createJSONStorage(() => localStorage),
        }
      )
    )
  )
);
