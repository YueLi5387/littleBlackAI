import { immer } from "zustand/middleware/immer";
import { create } from "zustand";
import { createJSONStorage, devtools } from "zustand/middleware";
import { persist } from "zustand/middleware";
import { UserStoreType } from "@/lib/types/userStoreType";
import { User } from "@/lib/types/userStoreType";

export const useUserStore = create<UserStoreType>()(
  immer(
    devtools(
      persist(
        (set, get) => {
          return {
            user: null,
            token: "", // 添加 token 属性
            setUser: (value: User) => {
              set((state: any) => {
                state.user = value;
              });
            },
            getUser: (): User | null => {
              return get().user;
            },
            setToken: (value: string) => {
              set((state: any) => {
                state.token = value;
              });
            },
            getToken: (): string => {
              return get().token;
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
