export type UserGender = "male" | "female";

export interface User {
    username: string;
    createdAt: string;
    name: string;
    surname: string;
    patronymic: string;
    gender: UserGender;
    dateOfBirth: string;
    avatarPath?: string | null;
}
