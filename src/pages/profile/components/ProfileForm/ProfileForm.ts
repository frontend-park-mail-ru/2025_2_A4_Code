import { Component } from "@shared/base/Component";
import { InputFieldComponent } from "@shared/components/InputField/InputField";
import { RadioGroupComponent } from "@shared/components/RadioGroup/RadioGroup";
import { ButtonComponent } from "@shared/components/Button/Button";
import template from "./ProfileForm.hbs";
import "./ProfileForm.scss";
import type { FieldError, ProfileFormFields } from "@utils";
import { getInitials } from "@utils/person";
import { PROFILE_FORM_TEXTS } from "@pages/constants/texts";
import { getOnlineStatus, subscribeToOnlineStatus } from "@shared/utils/onlineStatus";

type Gender = "male" | "female" | "";

type EditableValues = {
    firstName: string;
    lastName: string;
    middleName: string;
    birthDate: string;
    gender: Gender;
};

type Props = EditableValues & {
    fullName: string;
    email: string;
    username: string;
    avatarUrl?: string | null;
    isAvatarUploading?: boolean;
    isSubmitting?: boolean;
    onAvatarSelect?: (file: File) => void;
    onSubmit?: (values: EditableValues) => void;
    onCancel?: () => void;
};

const MAX_AVATAR_SIZE = 5 << 20; // 5 MB
const UPLOAD_BUTTON_DEFAULT_LABEL = PROFILE_FORM_TEXTS.uploadButtonDefault;
const UPLOAD_BUTTON_LOADING_LABEL = PROFILE_FORM_TEXTS.uploadButtonLoading;

export class ProfileFormComponent extends Component<Props> {
    private readonly firstNameField: InputFieldComponent;
    private readonly lastNameField: InputFieldComponent;
    private readonly middleNameField: InputFieldComponent;
    private readonly birthDateField: InputFieldComponent;
    private readonly genderField: RadioGroupComponent;

    private readonly uploadButton: ButtonComponent;
    private readonly saveButton: ButtonComponent;
    private readonly cancelButton: ButtonComponent;

    private fileInput: HTMLInputElement | null = null;
    private initialValues: EditableValues;
    private currentValues: EditableValues;
    private fieldErrors: Partial<Record<keyof EditableValues, string>> = {};
    private isOnline: boolean = getOnlineStatus();
    private unsubscribeOnline?: () => void;

    constructor(props: Props) {
        super({
            ...props,
            avatarUrl: props.avatarUrl ?? null,
            gender: props.gender ?? "",
            birthDate: props.birthDate ?? "",
            isAvatarUploading: props.isAvatarUploading ?? false,
            isSubmitting: props.isSubmitting ?? false,
        });

        this.initialValues = this.pickEditableValues(this.props);
        this.currentValues = { ...this.initialValues };

        this.firstNameField = new InputFieldComponent({
            label: PROFILE_FORM_TEXTS.firstNameLabel,
            name: "firstName",
            variant: "filled",
            onInput: (value) => this.handleInputChange("firstName", value),
        });

        this.lastNameField = new InputFieldComponent({
            label: PROFILE_FORM_TEXTS.lastNameLabel,
            name: "lastName",
            variant: "filled",
            onInput: (value) => this.handleInputChange("lastName", value),
        });

        this.middleNameField = new InputFieldComponent({
            label: PROFILE_FORM_TEXTS.middleNameLabel,
            name: "middleName",
            variant: "filled",
            onInput: (value) => this.handleInputChange("middleName", value),
        });

        this.birthDateField = new InputFieldComponent({
            label: PROFILE_FORM_TEXTS.birthDateLabel,
            name: "birthDate",
            type: "date",
            variant: "filled",
            onInput: (value) => this.handleInputChange("birthDate", value),
        });

        this.genderField = new RadioGroupComponent({
            name: "gender",
            label: PROFILE_FORM_TEXTS.genderLabel,
            options: [
                { label: PROFILE_FORM_TEXTS.genderOptions.male, value: "male" },
                { label: PROFILE_FORM_TEXTS.genderOptions.female, value: "female" },
            ],
            value: this.props.gender ?? "",
            onChange: (value) => this.handleInputChange("gender", value),
        });

        this.uploadButton = new ButtonComponent({
            label: UPLOAD_BUTTON_DEFAULT_LABEL,
            variant: "secondary",
            onClick: () => this.handleUploadClick(),
        });

        this.saveButton = new ButtonComponent({
            label: PROFILE_FORM_TEXTS.saveButtonLabel,
            variant: "primary",
            onClick: () => this.handleSave(),
        });

        this.cancelButton = new ButtonComponent({
            label: PROFILE_FORM_TEXTS.cancelButtonLabel,
            variant: "secondary",
            onClick: () => this.handleCancel(),
        });

        this.applyOnlineState();
        this.unsubscribeOnline = subscribeToOnlineStatus((online) => {
            this.isOnline = online;
            this.applyOnlineState();
        });
    }

    protected renderTemplate(): string {
        return template({
            fullName: this.props.fullName,
            avatarUrl: this.props.avatarUrl ?? null,
            initials: getInitials(this.props.fullName),
            title: PROFILE_FORM_TEXTS.title,
        });
    }

    protected afterRender(): void {
        this.mountField("firstName", this.firstNameField);
        this.mountField("lastName", this.lastNameField);
        this.mountField("middleName", this.middleNameField);
        this.mountField("birthDate", this.birthDateField);
        this.mountField("gender", this.genderField);

        this.mountField("upload", this.uploadButton);
        this.mountField("save", this.saveButton);
        this.mountField("cancel", this.cancelButton);

        this.ensureFileInput();
        this.setFieldValues(this.currentValues);
        this.updateFullNameFromValues(this.currentValues);
        this.updateAvatar();
        this.updateUploadButton();
        this.updateButtons();
        this.applyOnlineState();
    }

    public setProfile(values: Partial<Props>): void {
        this.props = {
            ...this.props,
            ...values,
        };

        this.initialValues = this.pickEditableValues(this.props);
        this.currentValues = { ...this.initialValues };
        this.clearErrors();
        this.setFieldValues(this.currentValues);
        this.updateFullNameFromValues(this.currentValues);
        this.updateAvatar();
        this.updateUploadButton();
        this.updateButtons();
        this.applyOnlineState();
    }

    public setAvatarUrl(avatarUrl: string | null): void {
        this.props = {
            ...this.props,
            avatarUrl,
        };
        this.updateAvatar();
    }

    public setAvatarUploading(isUploading: boolean): void {
        this.props = {
            ...this.props,
            isAvatarUploading: isUploading,
        };
        this.updateUploadButton();
        this.updateButtons();
        this.applyOnlineState();
    }

    public setSubmitting(isSubmitting: boolean): void {
        this.props = {
            ...this.props,
            isSubmitting,
        };
        this.updateButtons();
        this.applyOnlineState();
    }

    public async unmount(): Promise<void> {
        this.unsubscribeOnline?.();
        this.unsubscribeOnline = undefined;
        if (this.fileInput) {
            this.fileInput.removeEventListener("change", this.handleFileChange);
            this.fileInput = null;
        }

        await Promise.all([
            this.firstNameField.unmount(),
            this.lastNameField.unmount(),
            this.middleNameField.unmount(),
            this.birthDateField.unmount(),
            this.genderField.unmount(),
            this.uploadButton.unmount(),
            this.saveButton.unmount(),
            this.cancelButton.unmount(),
        ]);

        await super.unmount();
    }

    private mountField(slot: string, component: Component): void {
        const container = this.element?.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
        if (!container) return;
        container.innerHTML = "";
        const rendered = component.render();
        container.appendChild(rendered);
        component.mount(container).then();
    }

    private pickEditableValues(source: Partial<Props>): EditableValues {
        return {
            firstName: source.firstName ?? "",
            lastName: source.lastName ?? "",
            middleName: source.middleName ?? "",
            birthDate: source.birthDate ?? "",
            gender: this.normalizeGender(source.gender),
        };
    }

    private setFieldValues(values: EditableValues): void {
        this.firstNameField.setValue(values.firstName ?? "");
        this.lastNameField.setValue(values.lastName ?? "");
        this.middleNameField.setValue(values.middleName ?? "");
        this.birthDateField.setValue(values.birthDate ?? "");
        this.genderField.setValue(values.gender || "");
    }

    private handleInputChange(field: keyof EditableValues, rawValue: string): void {
        if (field === "gender") {
            this.currentValues = {
                ...this.currentValues,
                gender: this.normalizeGender(rawValue),
            };
        } else {
            this.currentValues = {
                ...this.currentValues,
                [field]: rawValue,
            };
        }

        this.clearFieldError(field);
        this.updateFullNameFromValues(this.currentValues);
        this.updateUploadButton();
        this.updateButtons();
    }

    private handleSave(): void {
        if (this.props.isSubmitting || this.props.isAvatarUploading || !this.isDirty()) {
            return;
        }
        this.props.onSubmit?.({ ...this.currentValues });
    }

    private handleCancel(): void {
        this.currentValues = { ...this.initialValues };
        this.setFieldValues(this.currentValues);
        this.updateFullNameFromValues(this.currentValues);
        this.updateButtons();
        this.props.onCancel?.();
    }

    private ensureFileInput(): void {
        if (!this.element) return;
        if (!this.fileInput) {
            this.fileInput = document.createElement("input");
            this.fileInput.type = "file";
            this.fileInput.accept = "image/*";
            this.fileInput.style.display = "none";
            this.fileInput.addEventListener("change", this.handleFileChange);
        }

        if (!this.fileInput.isConnected) {
            this.element.appendChild(this.fileInput);
        }
    }

    private updateAvatar(): void {
        const avatarContainer = this.element?.querySelector(".profile-form__avatar") as HTMLElement | null;
        if (!avatarContainer) return;

        const initials = getInitials(this.props.fullName);
        const uploadSlot = avatarContainer.querySelector('[data-slot="upload"]');
        let imageEl = avatarContainer.querySelector("img") as HTMLImageElement | null;
        let placeholderEl = avatarContainer.querySelector("span") as HTMLElement | null;

        if (this.props.avatarUrl) {
            if (!imageEl) {
                imageEl = document.createElement("img");
                if (uploadSlot) {
                    avatarContainer.insertBefore(imageEl, uploadSlot);
                } else {
                    avatarContainer.appendChild(imageEl);
                }
            }
            imageEl.src = this.props.avatarUrl;
            imageEl.alt = this.props.fullName;
            imageEl.style.display = "block";
            placeholderEl?.remove();
        } else {
            if (imageEl) {
                imageEl.remove();
            }

            if (!placeholderEl) {
                placeholderEl = document.createElement("span");
                if (uploadSlot) {
                    avatarContainer.insertBefore(placeholderEl, uploadSlot);
                } else {
                    avatarContainer.appendChild(placeholderEl);
                }
            }
            placeholderEl.textContent = initials;
        }
    }

    private updateUploadButton(): void {
        const isUploading = Boolean(this.props.isAvatarUploading);
        this.uploadButton.setProps({
            label: this.getUploadButtonLabel(),
            disabled: isUploading || !this.isOnline,
            variant: "secondary",
            onClick: () => this.handleUploadClick(),
        });
    }

    private getUploadButtonLabel(): string {
        return this.props.isAvatarUploading ? UPLOAD_BUTTON_LOADING_LABEL : UPLOAD_BUTTON_DEFAULT_LABEL;
    }



    private updateButtons(): void {
        const isSubmitting = Boolean(this.props.isSubmitting);
        const isUploading = Boolean(this.props.isAvatarUploading);
        const hasChanges = this.isDirty();

        this.saveButton.setProps({
            label: isSubmitting ? PROFILE_FORM_TEXTS.saveButtonLoading : PROFILE_FORM_TEXTS.saveButtonLabel,
            disabled: isSubmitting || isUploading || !hasChanges || !this.isOnline,
            variant: "primary",
            onClick: () => this.handleSave(),
        });

        this.cancelButton.setProps({
            label: PROFILE_FORM_TEXTS.cancelButtonLabel,
            disabled: isSubmitting || !this.isOnline,
            variant: "secondary",
            onClick: () => this.handleCancel(),
        });
    }

    public setErrors(errors: FieldError<keyof ProfileFormFields>[]): void {
        const map = new Map<keyof ProfileFormFields, string>();
        errors.forEach((error) => map.set(error.field, error.message));
        this.setFieldError("firstName", map.get("firstName") ?? null);
        this.setFieldError("lastName", map.get("lastName") ?? null);
        this.setFieldError("middleName", map.get("middleName") ?? null);
        this.setFieldError("birthDate", map.get("birthDate") ?? null);
        this.setFieldError("gender", map.get("gender") ?? null);
    }

    public clearErrors(): void {
        this.setFieldError("firstName", null);
        this.setFieldError("lastName", null);
        this.setFieldError("middleName", null);
        this.setFieldError("birthDate", null);
        this.setFieldError("gender", null);
    }

    private setFieldError(field: keyof EditableValues, message: string | null): void {
        this.fieldErrors[field] = message ?? undefined;
        switch (field) {
            case "firstName":
                this.firstNameField.setError(message);
                break;
            case "lastName":
                this.lastNameField.setError(message);
                break;
            case "middleName":
                this.middleNameField.setError(message);
                break;
            case "birthDate":
                this.birthDateField.setError(message);
                break;
            default:
                break;
        }
    }

    private clearFieldError(field: keyof EditableValues): void {
        if (this.fieldErrors[field]) {
            this.setFieldError(field, null);
        }
    }

    private handleUploadClick(): void {
        if (this.props.isAvatarUploading || !this.isOnline) {
            return;
        }
        this.fileInput?.click();
    }

    private handleFileChange = (): void => {
        const file = this.fileInput?.files?.[0];
        if (!file) {
            return;
        }

        if (file.size > MAX_AVATAR_SIZE) {
            console.warn(PROFILE_FORM_TEXTS.avatarTooLargeWarning);
            this.fileInput!.value = "";
            return;
        }

        this.props.onAvatarSelect?.(file);
        this.fileInput!.value = "";
    };

    private updateFullNameFromValues(values: EditableValues): void {
        const fullName = this.buildFullName(values);
        this.props = {
            ...this.props,
            fullName,
        };
        this.updateAvatar();
    }

    private buildFullName(values: EditableValues): string {
        const parts = [values.firstName, values.lastName, values.middleName]
            .map((part) => part.trim())
            .filter(Boolean);
        if (parts.length > 0) {
            return parts.join(" ");
        }

        const fallback = this.props.username?.trim() || this.props.email?.trim() || this.props.fullName || "";
        return fallback || "--";
    }

    private isDirty(): boolean {
        return (
            this.initialValues.firstName !== this.currentValues.firstName ||
            this.initialValues.lastName !== this.currentValues.lastName ||
            this.initialValues.middleName !== this.currentValues.middleName ||
            (this.initialValues.birthDate || "") !== (this.currentValues.birthDate || "") ||
            (this.initialValues.gender || "") !== (this.currentValues.gender || "")
        );
    }

    private normalizeGender(value: string | undefined): Gender {
        if (value === "male" || value === "female") {
            return value;
        }
        return "";
    }

    private applyOnlineState(): void {
        const inputsDisabled = !this.isOnline;
        this.firstNameField.setDisabled(inputsDisabled);
        this.lastNameField.setDisabled(inputsDisabled);
        this.middleNameField.setDisabled(inputsDisabled);
        this.birthDateField.setDisabled(inputsDisabled);
        this.genderField.setDisabled(inputsDisabled);

        if (this.fileInput) {
            this.fileInput.disabled = inputsDisabled;
        }

        this.updateUploadButton();
        this.updateButtons();
    }

}

