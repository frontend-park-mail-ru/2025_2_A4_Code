import { Component } from "@shared/base/Component";
import "./ProfileInfoForm.scss";

type TimeRange = { from: string; to: string };

type Props = {
    description?: string;
    timeRange?: TimeRange;
    onSave?: (data: { description: string; timeRange: TimeRange }) => void;
};

export class ProfileInfoFormComponent extends Component<Props> {
    private descriptionInput?: HTMLTextAreaElement | null;
    private fromSelect?: HTMLSelectElement | null;
    private toSelect?: HTMLSelectElement | null;

    constructor(props: Props = {}) {
        super(props);
    }

    protected renderTemplate(): string {
        const description = this.props.description ?? "";
        const timeFrom = this.props.timeRange?.from ?? "16:00";
        const timeTo = this.props.timeRange?.to ?? "16:00";
        const options = this.buildTimeOptions();

        return `
            <form class="profile-info-form">
                <div class="profile-info-form__card">
                    <div class="profile-info-form__field">
                        <label class="profile-info-form__label" for="profile-description">Описание:</label>
                        <textarea
                            id="profile-description"
                            class="profile-info-form__textarea"
                            name="description"
                            placeholder="Добавить описание"
                        >${description}</textarea>
                    </div>

                    <div class="profile-info-form__field">
                        <h3 class="profile-info-form__label">Избранные контакты</h3>
                        <p class="profile-info-form__placeholder">
                            Избранных контактов пока нет<br />
                            Перейдите в профиль контакта, чтобы добавить
                        </p>
                    </div>

                    <div class="profile-info-form__field">
                        <h3 class="profile-info-form__label">Удобное время</h3>
                        <p class="profile-info-form__helper">Обычно отвечаю на письма</p>
                        <div class="profile-info-form__time-row">
                            <span class="profile-info-form__time-label">с</span>
                            <select name="from" class="profile-info-form__select" data-role="from">
                                ${options
                                    .map(
                                        (value) =>
                                            `<option value="${value}" ${
                                                value === timeFrom ? "selected" : ""
                                            }>${value}</option>`
                                    )
                                    .join("")}
                            </select>
                            <span class="profile-info-form__time-label">до</span>
                            <select name="to" class="profile-info-form__select" data-role="to">
                                ${options
                                    .map(
                                        (value) =>
                                            `<option value="${value}" ${value === timeTo ? "selected" : ""}>${value}</option>`
                                    )
                                    .join("")}
                            </select>
                        </div>
                        <p class="profile-info-form__footnote">
                            Другие пользователи будут видеть это время в вашем профиле
                        </p>
                    </div>
                </div>

                <div class="profile-info-form__actions">
                    <button type="submit" class="profile-info-form__save">Сохранить</button>
                </div>
            </form>
        `;
    }

    protected afterRender(): void {
        const element = this.getElement();
        if (!element) return;

        this.descriptionInput = element.querySelector("#profile-description") as HTMLTextAreaElement | null;
        this.fromSelect = element.querySelector('[data-role="from"]') as HTMLSelectElement | null;
        this.toSelect = element.querySelector('[data-role="to"]') as HTMLSelectElement | null;

        element.addEventListener("submit", (event) => {
            event.preventDefault();
            this.handleSubmit();
        });
    }

    private handleSubmit(): void {
        const description = this.descriptionInput?.value?.trim() ?? "";
        const from = this.fromSelect?.value ?? "16:00";
        const to = this.toSelect?.value ?? "16:00";

        this.props.onSave?.({
            description,
            timeRange: { from, to },
        });
    }

    private buildTimeOptions(): string[] {
        const options: string[] = [];
        for (let hour = 0; hour < 24; hour += 1) {
            const value = `${hour.toString().padStart(2, "0")}:00`;
            options.push(value);
        }
        return options;
    }
}
