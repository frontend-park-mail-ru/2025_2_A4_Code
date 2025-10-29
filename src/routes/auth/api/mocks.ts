import {User} from "../../../types/user";

export const mockUser: User = {
    username: "ivanTake",
    createdAt: "01.10.2025",
    name: "Иван",
    surname: "Иванов",
    patronymic: "Иванович",
    gender: "male",
    dateOfBirth: "02.03.2000",
    avatarPath: "https://example.com/avatar/ivan.png",
};

export const mockLoginResponse = {
    status: "200",
    message: "You have successfully logged in",
    body: {
        user: mockUser,
        token: "mock-session-token",
    },
};

export const mockRegisterResponse = {
    status: "200",
    message: "You have successfully registered",
};
