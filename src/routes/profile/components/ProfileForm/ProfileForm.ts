import {Component} from "../../../../shared/base/Component";
import {InputFieldComponent} from "../../../../shared/components/InputField/InputField";
import {RadioGroupComponent} from "../../../../shared/components/RadioGroup/RadioGroup";
import {ButtonComponent} from "../../../../shared/components/Button/Button";
import template from "./ProfileForm.hbs";
import "./ProfileForm.scss";

type Props = {
    name: string;
    avatarUrl?: string | null;
};

export class ProfileFormComponent extends Component<Props> {
    private readonly firstNameField: InputFieldComponent;
    private readonly lastNameField: InputFieldComponent;
    private readonly middleNameField: InputFieldComponent;
    private readonly birthDateField: InputFieldComponent;
    private readonly genderField: RadioGroupComponent;
    private readonly cityField: InputFieldComponent;

    private readonly uploadButton: ButtonComponent;
    private readonly saveButton: ButtonComponent;
    private readonly cancelButton: ButtonComponent;

    constructor(props: Props) {
        super(props);

        this.firstNameField = new InputFieldComponent({
            label: "Имя",
            name: "firstName",
            variant: "filled",
        });

        this.lastNameField = new InputFieldComponent({
            label: "Фамилия",
            name: "lastName",
            variant: "filled",
        });

        this.middleNameField = new InputFieldComponent({
            label: "Отчество",
            name: "middleName",
            variant: "filled",
        });

        this.birthDateField = new InputFieldComponent({
            label: "Дата рождения",
            name: "birthDate",
            type: "date",
            variant: "filled",
        });

        this.genderField = new RadioGroupComponent({
            name: "gender",
            label: "Пол",
            options: [
                { label: "Мужской", value: "male" },
                { label: "Женский", value: "female" },
            ],
        });

        this.cityField = new InputFieldComponent({
            label: "Город",
            name: "city",
            variant: "filled",
        });

        this.uploadButton = new ButtonComponent({
            label: "Загрузить фото",
            variant: "link",
        });

        this.saveButton = new ButtonComponent({
            label: "Сохранить",
            variant: "primary",
        });

        this.cancelButton = new ButtonComponent({
            label: "Отменить",
            variant: "secondary",
        });
    }

    protected renderTemplate(): string {
        const initials = this.props.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        return template({
            name: this.props.name,
            avatarUrl: this.props.avatarUrl ?? null,
            initials,
        });
    }

    protected afterRender(): void {
        const mountField = (slot: string, component: Component) => {
            const container = this.element?.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
            if (!container) return;
            component.render();
            component.mount(container).then();
        };

        mountField("firstName", this.firstNameField);
        mountField("lastName", this.lastNameField);
        mountField("middleName", this.middleNameField);
        mountField("birthDate", this.birthDateField);
        mountField("gender", this.genderField);
        mountField("city", this.cityField);

        mountField("upload", this.uploadButton);
        mountField("save", this.saveButton);
        mountField("cancel", this.cancelButton);
    }

    public async unmount(): Promise<void> {
        await Promise.all([
            this.firstNameField.unmount(),
            this.lastNameField.unmount(),
            this.middleNameField.unmount(),
            this.birthDateField.unmount(),
            this.genderField.unmount(),
            this.cityField.unmount(),
            this.uploadButton.unmount(),
            this.saveButton.unmount(),
            this.cancelButton.unmount(),
        ]);
        await super.unmount();
    }
}
