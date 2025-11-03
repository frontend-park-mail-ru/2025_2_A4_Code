import {Page} from "../../shared/base/Page";
import {HeaderComponent} from "../../shared/widgets/Header/Header";
import {ProfileSidebarComponent} from "./components/ProfileSidebar/ProfileSidebar";
import {ProfileFormComponent} from "./components/ProfileForm/ProfileForm";
import {MainLayout} from "../../app/components/MainLayout/MainLayout";
import "./views/ProfilePage.scss";

type ProfilePageProps = {
    name?: string;
    email?: string;
    avatarUrl?: string | null;
};

export class ProfilePage extends Page {
    private readonly sidebar: ProfileSidebarComponent;
    private readonly form: ProfileFormComponent;
    private readonly header: HeaderComponent;

    constructor(props: ProfilePageProps = {}) {
        super();

        const name = props.name ?? "Татьяна Смирнова";
        const email = props.email ?? "t.smirnova@flintmail.ru";
        const avatarUrl = props.avatarUrl ?? null;

        this.sidebar = new ProfileSidebarComponent({
            name,
            email,
            avatarUrl,
            onNavigateInbox: () => this.router.navigate("/inbox"),
        });

        this.form = new ProfileFormComponent({
            name,
            avatarUrl,
        });

        this.header = new HeaderComponent({
            showSearch: false,
            onLogout: () => console.log("logout"),
        });
    }

    protected renderTemplate(): string {
        return `<div class="profile-page"></div>`;
    }

    protected getSlotContent() {
        return {
            header: this.header,
            sidebar: this.sidebar,
            main: this.form,
        };
    }

    public init(): void {
        if (this.layout instanceof MainLayout) {
            this.layout.setContentBackground(false);
            this.layout.setSidebarWidth("240px");
        }
    }

    public async unmount(): Promise<void> {
        if (this.layout instanceof MainLayout) {
            this.layout.setContentBackground(true);
            this.layout.setSidebarWidth(null);
        }
        await super.unmount();
    }
}
