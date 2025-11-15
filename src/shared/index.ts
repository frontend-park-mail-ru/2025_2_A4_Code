export { Component } from "./base/Component";
export { Layout, type SlotContent } from "./base/Layout";
export { Page } from "./base/Page";

export { LayoutLoadingManager } from "./utils/LayoutLoadingManager";
export { extractApiErrorMessage } from "./utils/apiError";
export { getOnlineStatus, subscribeToOnlineStatus } from "./utils/onlineStatus";

export { ApiService, apiService, type RequestOptions } from "./api/ApiService";
export type { ApiResponse } from "./api/types";

export { ButtonComponent } from "./components/Button/Button";
export { AvatarButtonComponent } from "./components/AvatarButton/AvatarButton";
export { InputFieldComponent } from "./components/InputField/InputField";
export { SelectFieldComponent } from "./components/SelectField/SelectField";
export { MailItemComponent } from "./components/MailItem/MailItem";
export { RadioGroupComponent } from "./components/RadioGroup/RadioGroup";
export { SearchInputComponent } from "./components/SearchInput/SearchInput";
export {
    SidebarFolderItem,
    type SidebarFolderItemProps,
} from "./components/SidebarFolderItem/SidebarFolderItem";
export { OfflinePlaceholderComponent } from "./components/OfflinePlaceholder/OfflinePlaceholder";

export { HeaderComponent } from "./widgets/Header/Header";
export { MailListComponent } from "./widgets/MailList/MailList";
export { AvatarMenu } from "./widgets/AvatarMenu/AvatarMenu";
export {
    SidebarComponent,
    type Folder as SidebarFolder,
} from "./widgets/Sidebar/Sidebar";

export {
    HEADER_TEXTS,
    AVATAR_MENU_TEXTS,
    SIDEBAR_TEXTS,
    type SidebarFolderText,
    MAIL_LIST_TEXTS,
    COMPOSE_MODAL_TEXTS,
} from "./constants/texts";
