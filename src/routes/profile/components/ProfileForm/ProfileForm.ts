import { Component } from "../../../../shared/base/Component";
import { InputFieldComponent } from "../../../../shared/components/InputField/InputField";
import { RadioGroupComponent } from "../../../../shared/components/RadioGroup/RadioGroup";
import { ButtonComponent } from "../../../../shared/components/Button/Button";
import template from "./ProfileForm.hbs";
import "./ProfileForm.scss";

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
            label: "Имя",
            name: "firstName",
            variant: "filled",
            onInput: (value) => this.handleInputChange("firstName", value),
        });

        this.lastNameField = new InputFieldComponent({
            label: "Фамилия",
            name: "lastName",
            variant: "filled",
            onInput: (value) => this.handleInputChange("lastName", value),
        });

        this.middleNameField = new InputFieldComponent({
            label: "Отчество",
            name: "middleName",
            variant: "filled",
            onInput: (value) => this.handleInputChange("middleName", value),
        });

        this.birthDateField = new InputFieldComponent({
            label: "Дата рождения",
            name: "birthDate",
            type: "date",
            variant: "filled",
            onInput: (value) => this.handleInputChange("birthDate", value),
        });

        this.genderField = new RadioGroupComponent({
            name: "gender",
            label: "Пол",
            options: [
                { label: "Мужской", value: "male" },
                { label: "Женский", value: "female" },
            ],
            value: this.props.gender ?? "",
            onChange: (value) => this.handleInputChange("gender", value),
        });

        this.uploadButton = new ButtonComponent({
            label: "Сменить аватар",
            variant: "link",
            onClick: () => this.handleUploadClick(),
        });

        this.saveButton = new ButtonComponent({
            label: "Сохранить",
            variant: "primary",
            onClick: () => this.handleSave(),
        });

        this.cancelButton = new ButtonComponent({
            label: "Отменить",
            variant: "secondary",
            onClick: () => this.handleCancel(),
        });
    }

    protected renderTemplate(): string {
        return template({
            fullName: this.props.fullName,
            avatarUrl: this.props.avatarUrl ?? null,
            initials: this.getInitials(this.props.fullName),
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
    }

    public setProfile(values: Partial<Props>): void {
        this.props = {
            ...this.props,
            ...values,
        };

        this.initialValues = this.pickEditableValues(this.props);
        this.currentValues = { ...this.initialValues };
        this.setFieldValues(this.currentValues);
        this.updateFullNameFromValues(this.currentValues);
        this.updateAvatar();
        this.updateUploadButton();
        this.updateButtons();
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
    }

    public setSubmitting(isSubmitting: boolean): void {
        this.props = {
            ...this.props,
            isSubmitting,
        };
        this.updateButtons();
    }

    public async unmount(): Promise<void> {
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

        this.updateFullNameFromValues(this.currentValues);
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

        const initials = this.getInitials(this.props.fullName);
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
            label: isUploading ? "Загрузка..." : "Сменить аватар",
            disabled: isUploading,
            variant: "link",
            onClick: () => this.handleUploadClick(),
        });
    }

    private updateButtons(): void {
        const isSubmitting = Boolean(this.props.isSubmitting);
        const isUploading = Boolean(this.props.isAvatarUploading);
        const hasChanges = this.isDirty();

        this.saveButton.setProps({
            label: isSubmitting ? "Сохраняем..." : "Сохранить",
            disabled: isSubmitting || isUploading || !hasChanges,
            variant: "primary",
            onClick: () => this.handleSave(),
        });

        this.cancelButton.setProps({
            label: "Отменить",
            disabled: isSubmitting,
            variant: "secondary",
            onClick: () => this.handleCancel(),
        });
    }

    private handleUploadClick(): void {
        if (this.props.isAvatarUploading) {
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
            console.warn("Размер файла превышает 5 МБ");
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

    private getInitials(fullName: string): string {
        const initials = fullName
            .split(" ")
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        return initials || "--";
    }
}
