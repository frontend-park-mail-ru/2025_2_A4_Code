import {Component} from "../../../../shared/base/Component";
import template from "./RegisterForm.hbs";
import "./RegisterForm.scss";
import {InputFieldComponent} from "../../../../shared/components/InputField/InputField";
import {RadioGroupComponent} from "../../../../shared/components/RadioGroup/RadioGroup";
import {ButtonComponent} from "../../../../shared/components/Button/Button";

type SubmitPayload = {
    name: string;
    login: string;
    birthdate: string;
    gender: string | undefined;
    password: string;
    passwordRepeat: string;
};

type Props = {
    onSubmit?: (payload: SubmitPayload) => void;
};

export class RegisterFormComponent extends Component<Props> {
    private nameField: InputFieldComponent;
    private loginField: InputFieldComponent;
    private birthdateField: InputFieldComponent;
    private genderGroup: RadioGroupComponent;
    private passwordField: InputFieldComponent;
    private passwordRepeatField: InputFieldComponent;
    private submitButton: ButtonComponent;

    constructor(props: Props = {}) {
        super(props);

        this.nameField = new InputFieldComponent({
            name: "name",
            placeholder: "Ваше имя",
            autocomplete: "name",
            required: true,
            variant: "underline",
        });

        this.loginField = new InputFieldComponent({
            name: "login",
            placeholder: "Логин@flintmail.ru",
            required: true,
            variant: "underline",
        });
        
        this.birthdateField = new InputFieldComponent({
            name: "birthdate",
            type: "date",
            variant: "underline",
        });

        this.genderGroup = new RadioGroupComponent({
            name: "gender",
            label: "Пол",
            options: [
                { label: "Мужской", value: "male" },
                { label: "Женский", value: "female" },
            ],
        });

        this.passwordField = new InputFieldComponent({
            name: "password",
            type: "password",
            placeholder: "Новый пароль",
            required: true,
            autocomplete: "new-password",
            variant: "underline",
        });

        this.passwordRepeatField = new InputFieldComponent({
            name: "passwordRepeat",
            type: "password",
            placeholder: "Повторите пароль",
            required: true,
            autocomplete: "new-password",
            variant: "underline",
        });

        this.submitButton = new ButtonComponent({
            type: "submit",
            label: "Зарегистрироваться",
            variant: "primary",
            fullWidth: true,
        });
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        const mount = (slotName: string, component: Component) => {
            const slot = this.element?.querySelector(`[data-slot="${slotName}"]`) as HTMLElement | null;
            if (!slot) return;
            component.render();
            component.mount(slot).then();
        };

        mount("name", this.nameField);
        mount("login", this.loginField);
        mount("birthdate", this.birthdateField);
        mount("gender", this.genderGroup);
        mount("password", this.passwordField);
        mount("passwordRepeat", this.passwordRepeatField);
        mount("submit", this.submitButton);

        const form = this.element?.querySelector('[data-form]') as HTMLFormElement | null;
        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.props.onSubmit?.({
                name: this.nameField.getValue(),
                login: this.loginField.getValue(),
                birthdate: this.birthdateField.getValue(),
                gender: this.genderGroup.getValue(),
                password: this.passwordField.getValue(),
                passwordRepeat: this.passwordRepeatField.getValue(),
            });
        });
    }
}

