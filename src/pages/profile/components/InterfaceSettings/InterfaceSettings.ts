import { Component } from "@shared/base/Component";
import { ButtonComponent } from "@shared/components/Button/Button";
import { InputFieldComponent } from "@shared/components/InputField/InputField";
import template from "./InterfaceSettings.hbs";
import "./InterfaceSettings.scss";
import { fetchFolders, createFolder, renameFolder, deleteFolder, type FolderSummary, MAX_FOLDER_NAME_LENGTH } from "@entities/mail";
import { SIDEBAR_TEXTS } from "@shared/constants/texts";
import { CreateFolderModal } from "../../../inbox/components/CreateFolderModal/CreateFolderModal";

export type ItemId = "theme" | "signature" | "folders";

const MAX_NAME_LENGTH = MAX_FOLDER_NAME_LENGTH;
const THEME_STORAGE_KEY = "ui-theme";
type ThemeId = "light" | "dark";
const THEME_PRESETS: Record<ThemeId, { name: string; description: string; colors: { bg: string; panel: string; text: string; muted: string; border: string } }> = {
    light: {
        name: "Стандартная",
        description: "Светлые фоны и привычный контраст.",
        colors: { bg: "#EFF2F7", panel: "#FFFFFF", text: "#1f2544", muted: "#6b7280", border: "#dbe1f1" },
    },
    dark: {
        name: "Темная",
        description: "Темные панели и мягкие акценты.",
        colors: { bg: "#0b1220", panel: "#0f172a", text: "#e5e7eb", muted: "#cbd5e1", border: "#243047" },
    },
};
const THEME_ORDER: ThemeId[] = ["light", "dark"];

export class InterfaceSettingsComponent extends Component {
    private readonly items: { id: ItemId; slot: string; label: string; icon: string }[] = [
        { id: "theme", slot: "theme", label: "Оформление", icon: "/img/interface-theme.svg" },
        { id: "signature", slot: "signature", label: "Подпись", icon: "/img/interface-signature.svg" },
        { id: "folders", slot: "folders", label: "Папки", icon: "/img/interface-folders.svg" },
    ];

    private activeItem: ItemId = "folders";
    private containers = new Map<ItemId, HTMLElement>();
    private folders: FolderSummary[] = [];
    private loading = false;
    private saving = false;
    private editingId: string | null = null;
    private renameDrafts = new Map<string, string>();
    private deleteSet = new Set<string>();
    private errorEl: HTMLElement | null = null;
    private rowsRoot: HTMLElement | null = null;
    private rowsMap = new Map<string, HTMLElement>();
    private createFolderModal: CreateFolderModal | null = null;
    private modalHost: HTMLElement | null = null;
    private saveBtn?: ButtonComponent;
    private cancelBtn?: ButtonComponent;
    private editingValue: string | null = null;
    private footerEl: HTMLElement | null = null;
    private currentTheme: ThemeId = "light";
    private themeRoot: HTMLElement | null = null;

    private readonly placeholders: Record<ItemId, string> = {
        theme: "мы работаем над этим",
        signature: "мы работаем над этим",
        folders: "",
    };

    constructor(private readonly props: { initialItem?: ItemId } = {}) {
        super();
        this.activeItem = props.initialItem ?? "folders";
        this.currentTheme = this.readStoredTheme();
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        this.items.forEach((item) => {
            const container = this.element?.querySelector(`[data-slot="${item.slot}"]`) as HTMLElement | null;
            if (!container) return;
            this.containers.set(item.id, container);

            const button = new ButtonComponent({
                label: item.label,
                variant: "link",
                type: "button",
                icon: `<img src="${item.icon}" alt="" aria-hidden="true" class="interface-settings__icon" />`,
                onClick: () => this.handleSelect(item.id),
            });
            button.render();
            button.mount(container).then();

            if (item.id === this.activeItem) {
                container.classList.add("interface-settings__item--active");
            }
        });

        this.renderContent();
        void this.loadFolders();
    }

    private handleSelect(id: ItemId): void {
        if (this.activeItem === id) return;
        this.activeItem = id;
        this.updateActiveState();
        this.renderContent();
    }

    private updateActiveState(): void {
        this.containers.forEach((container, id) => {
            container.classList.toggle("interface-settings__item--active", id === this.activeItem);
        });
    }

    public setActiveItem(id: ItemId): void {
        if (this.activeItem === id) {
            return;
        }
        this.activeItem = id;
        this.updateActiveState();
        this.renderContent();
    }

    private async loadFolders(): Promise<void> {
        this.loading = true;
        try {
            this.folders = await fetchFolders();
        } catch (error) {
            console.error("Failed to load folders", error);
            this.folders = [];
        } finally {
            this.loading = false;
            this.resetDrafts();
            this.renderContent();
        }
    }

    private resetDrafts(): void {
        this.editingId = null;
        this.renameDrafts.clear();
        this.deleteSet.clear();
        if (this.errorEl) this.errorEl.textContent = "";
        this.updateSaveButtonState();
        this.editingValue = null;
    }

    private renderContent(): void {
        const contentRoot = this.getContentRoot();
        if (!contentRoot) return;

        if (this.activeItem !== "theme") {
            this.themeRoot = null;
        }

        if (this.activeItem === "theme") {
            this.teardownFolderView();
            contentRoot.innerHTML = "";
            const placeholder = document.createElement("div");
            placeholder.className = "interface-settings__state interface-settings__state--placeholder";
            placeholder.textContent = this.placeholders.theme || "мы работаем над этим";
            contentRoot.appendChild(placeholder);
            return;
        }

        if (this.activeItem === "signature") {
            this.teardownFolderView();
            contentRoot.innerHTML = "";
            const placeholder = document.createElement("div");
            placeholder.className = "interface-settings__state interface-settings__state--placeholder";
            placeholder.textContent =
                this.placeholders.signature || "Скоро здесь появится управление подписью";
            contentRoot.appendChild(placeholder);
            return;
        }

        if (this.rowsRoot && this.rowsRoot.parentElement !== contentRoot) {
            this.rowsRoot = null;
        }

        const prevScroll = contentRoot.scrollTop;
        contentRoot.innerHTML = "";

        if (!this.rowsRoot) {
            this.rowsRoot = document.createElement("div");
            this.rowsRoot.className = "interface-settings__folder-list";
        }

        if (!this.footerEl) {
            this.footerEl = this.renderFooterActions();
        }

        contentRoot.append(this.rowsRoot, this.footerEl);

        if (this.loading) {
            this.rowsMap.clear();
            this.rowsRoot.replaceChildren(this.buildStateElement("Загружаем папки..."), this.renderNewFolderRow());
        } else if (this.folders.length === 0) {
            this.rowsMap.clear();
            this.rowsRoot.replaceChildren(
                this.buildStateElement("Папок нет, добавьте первую ниже."),
                this.renderNewFolderRow()
            );
        } else {
            Array.from(this.rowsRoot.children).forEach((child) => {
                const isRow = child.classList.contains("interface-settings__row");
                const isNew = child.classList.contains("interface-settings__row--new");
                if (!isRow || isNew) {
                    child.remove();
                }
            });

            const seen = new Set<string>();
            this.getSortedFolders().forEach((folder) => {
                const row = this.renderOrUpdateRow(folder);
                if (!row.parentElement) {
                    this.rowsRoot!.appendChild(row);
                }
                seen.add(folder.id);
            });

            Array.from(this.rowsRoot.querySelectorAll<HTMLElement>(".interface-settings__row[data-folder-id]"))
                .forEach((child) => {
                    const id = child.getAttribute("data-folder-id");
                    if (id && !seen.has(id)) {
                        child.remove();
                        this.rowsMap.delete(id);
                    }
                });

            this.rowsRoot.querySelectorAll(".interface-settings__row--new").forEach((node) => node.remove());
            this.rowsRoot.appendChild(this.renderNewFolderRow());
        }

        contentRoot.scrollTop = prevScroll;
        this.updateSaveButtonState();
        if (this.editingId) {
            this.updateAcceptButtonState(this.editingId);
        }
    }

    private teardownFolderView(): void {
        this.rowsRoot = null;
        this.rowsMap.clear();
        this.editingId = null;
        this.editingValue = null;
        this.renameDrafts.clear();
        this.deleteSet.clear();
        this.errorEl = null;
        this.saveBtn = undefined;
        this.cancelBtn = undefined;
        this.footerEl = null;
    }

    private buildStateElement(text: string): HTMLElement {
        const el = document.createElement("div");
        el.className = "interface-settings__state";
        el.textContent = text;
        return el;
    }

    private renderOrUpdateRow(folder: FolderSummary): HTMLElement {
        const next = this.renderFolderRow(folder);
        next.setAttribute("data-folder-id", folder.id);
        const prev = this.rowsMap.get(folder.id);
        if (prev && prev.parentElement === this.rowsRoot) {
            this.rowsRoot!.replaceChild(next, prev);
        }
        this.rowsMap.set(folder.id, next);
        return next;
    }

    private getSortedFolders(): FolderSummary[] {
        const systemOrder = new Map<string, number>();
        SIDEBAR_TEXTS.defaultFolders.forEach((f, idx) => systemOrder.set(f.id.toLowerCase(), idx));

        return [...this.folders].sort((a, b) => {
            const aKey = (a.type || a.id).toLowerCase();
            const bKey = (b.type || b.id).toLowerCase();
            const aIsSystem = aKey !== "custom";
            const bIsSystem = bKey !== "custom";
            const aWeight = systemOrder.get(aKey) ?? (aIsSystem ? 50 : 100);
            const bWeight = systemOrder.get(bKey) ?? (bIsSystem ? 50 : 100);
            if (aWeight !== bWeight) {
                return aWeight - bWeight;
            }
            return a.name.localeCompare(b.name);
        });
    }

    private renderFolderRow(folder: FolderSummary): HTMLElement {
        const isProtected = this.isProtectedFolder(folder);
        const isEditing = this.editingId === folder.id;
        const row = document.createElement("div");
        row.className = "interface-settings__row";
        if (this.deleteSet.has(folder.id)) {
            row.classList.add("interface-settings__row--pending-delete");
        }

        const left = document.createElement("div");
        left.className = "interface-settings__row-left";

        const icon = document.createElement("span");
        icon.className = "interface-settings__row-icon";
        icon.style.backgroundImage = `url(${this.resolveFolderIcon(folder)})`;
        left.appendChild(icon);

        const actions = document.createElement("div");
        actions.className = "interface-settings__row-actions";

        const nameWrap = document.createElement("div");
        nameWrap.className = "interface-settings__row-name";
        const displayName = this.renameDrafts.get(folder.id) ?? folder.name;
        const currentName = isEditing ? this.editingValue ?? displayName : displayName;
        const remaining = MAX_NAME_LENGTH - (currentName?.length ?? 0);

        if (isEditing) {
            const counter = this.createCounter(remaining);
            const input = new InputFieldComponent({
                name: `folder-${folder.id}`,
                value: currentName,
                variant: "underline",
                placeholder: "Название папки",
                onInput: (val) => this.handleNameInput(folder.id, val, counter),
            });
            input.render();
            input.mount(nameWrap).then();

            if (!isProtected && !this.deleteSet.has(folder.id)) {
                const acceptBtn = this.createIconButton(
                    "/img/folder-edit-accept.svg",
                    "Принять",
                    () => {
                        if (remaining < 0) {
                            return;
                        }
                        const finalNameRaw = this.editingValue ?? displayName;
                        const finalName = finalNameRaw.trim();
                        if (!finalName) {
                            return;
                        }
                        if (this.isDuplicateName(finalName, folder.id)) {
                            this.setError("Папка с таким названием уже существует");
                            return;
                        }
                        this.renameDrafts.set(folder.id, finalName || folder.name);
                        this.editingId = null;
                        this.editingValue = null;
                        this.renderContent();
                    },
                    remaining < 0 || this.isDuplicateName(currentName, folder.id),
                    "accept"
                );
                actions.appendChild(acceptBtn);
                actions.appendChild(counter);
            }
        } else {
            nameWrap.textContent = currentName;
        }

        left.appendChild(nameWrap);

        if (!isProtected && !this.deleteSet.has(folder.id) && !isEditing) {
            const editBtn = this.createIconButton("/img/folder-edit-name.svg", "Редактировать", () => {
                const contentRoot = this.getContentRoot();
                const scroll = contentRoot?.scrollTop ?? 0;
                if (this.editingId && this.editingId !== folder.id) {
                    this.editingValue = null;
                }
                this.editingId = folder.id;
                this.editingValue = this.renameDrafts.get(folder.id) ?? folder.name;
                this.renderContent();
                if (contentRoot) contentRoot.scrollTop = scroll;
            });
            actions.appendChild(editBtn);

            const deleteBtn = this.createIconButton("/img/folder-edit-delete.svg", "Удалить", () => {
                const contentRoot = this.getContentRoot();
                const scroll = contentRoot?.scrollTop ?? 0;
                this.deleteSet.add(folder.id);
                if (this.editingId === folder.id) {
                    this.editingId = null;
                }
                this.renderContent();
                if (contentRoot) contentRoot.scrollTop = scroll;
            });
            actions.appendChild(deleteBtn);
        } else if (this.deleteSet.has(folder.id)) {
            const undoBtn = this.createIconButton("/img/folder-edit-name.svg", "Вернуть папку", () => {
                const contentRoot = this.getContentRoot();
                const scroll = contentRoot?.scrollTop ?? 0;
                this.deleteSet.delete(folder.id);
                this.renderContent();
                if (contentRoot) contentRoot.scrollTop = scroll;
            });
            actions.appendChild(undoBtn);
        }

        left.appendChild(actions);
        row.appendChild(left);
        return row;
    }

    private renderNewFolderRow(): HTMLElement {
        const row = document.createElement("div");
        row.className = "interface-settings__row interface-settings__row--new";
        row.setAttribute("role", "button");
        row.tabIndex = 0;
        row.onclick = () => this.openCreateFolderModal();
        row.onkeydown = (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                this.openCreateFolderModal();
            }
        };

        const left = document.createElement("div");
        left.className = "interface-settings__row-left";

        const icon = document.createElement("span");
        icon.className = "interface-settings__row-icon interface-settings__row-icon--add";
        icon.style.backgroundImage = "url(/img/folder-add.svg)";
        left.appendChild(icon);

        const label = document.createElement("span");
        label.className = "interface-settings__row-new-label";
        label.textContent = "Новая папка";
        left.appendChild(label);

        row.appendChild(left);
        return row;
    }

    private renderFooterActions(): HTMLElement {
        const footer = document.createElement("div");
        footer.className = "interface-settings__footer";

        const error = document.createElement("div");
        error.className = "interface-settings__error";
        this.errorEl = error;

        const actions = document.createElement("div");
        actions.className = "interface-settings__footer-actions";

        const saveBtn = new ButtonComponent({
            label: "Сохранить",
            variant: "primary",
            disabled: this.saving || this.hasNameOverflow(),
            onClick: () => this.handleSave(),
        });
        const cancelBtn = new ButtonComponent({
            label: "Отменить",
            variant: "secondary",
            disabled: this.saving,
            onClick: () => this.loadFolders(),
        });
        saveBtn.render();
        cancelBtn.render();
        this.saveBtn = saveBtn;
        this.cancelBtn = cancelBtn;
        saveBtn.mount(actions).then();
        cancelBtn.mount(actions).then();

        footer.append(error, actions);
        return footer;
    }

    private createIconButton(
        iconUrl: string,
        ariaLabel: string,
        onClick: () => void,
        disabled = false,
        dataAction?: string
    ): HTMLElement {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "interface-settings__icon-btn" + (disabled ? " interface-settings__icon-btn--disabled" : "");
        btn.setAttribute("aria-label", ariaLabel);
        if (dataAction) {
            btn.setAttribute("data-action", dataAction);
        }
        const icon = document.createElement("img");
        icon.src = iconUrl;
        icon.alt = "";
        btn.appendChild(icon);
        if (!disabled) {
            btn.onclick = onClick;
        } else {
            btn.setAttribute("disabled", "disabled");
        }
        return btn;
    }

    private createCounter(remaining: number): HTMLElement {
        const counter = document.createElement("span");
        this.updateCounter(counter, remaining);
        return counter;
    }

    private updateCounter(el: HTMLElement, remaining: number): void {
        el.textContent = `${remaining}`;
        el.className = "interface-settings__counter" + (remaining < 0 ? " interface-settings__counter--over" : "");
    }

    private async handleSave(): Promise<void> {
        if (this.saving) return;
        if (this.hasNameOverflow()) {
            return;
        }
        if (this.hasDuplicateNames()) {
            this.setError("Папка с таким названием уже существует");
            return;
        }
        this.saving = true;
        this.setError("");

        try {
            for (const id of Array.from(this.deleteSet)) {
                const folder = this.folders.find((f) => f.id === id);
                if (!folder || this.isProtectedFolder(folder)) {
                    continue;
                }
                await deleteFolder(folder.backendId || folder.id);
            }

            for (const [id, name] of Array.from(this.renameDrafts.entries())) {
                if (this.deleteSet.has(id)) {
                    continue;
                }
                const folder = this.folders.find((f) => f.id === id);
                const trimmed = name.trim();
                if (!folder || this.isProtectedFolder(folder) || !trimmed || trimmed === folder.name) {
                    continue;
                }
                await renameFolder(folder.backendId || folder.id, trimmed);
            }

            await this.loadFolders();
        } catch (error) {
            console.error("Failed to apply folder changes", error);
            this.setError(error instanceof Error ? error.message : "Не удалось применить изменения папок");
        } finally {
            this.saving = false;
            this.updateSaveButtonState();
        }
    }

    private setError(message: string): void {
        if (this.errorEl) {
            this.errorEl.textContent = message;
        }
    }

    private openCreateFolderModal(): void {
        if (this.createFolderModal) return;
        const modal = new CreateFolderModal({
            onClose: () => this.closeCreateFolderModal(),
            onSave: async (name) => this.handleCreateFolder(name),
        });
        this.createFolderModal = modal;

        const host = document.createElement("div");
        this.modalHost = host;
        document.body.appendChild(host);

        modal.render();
        modal.mount(host).then();
    }

    private async handleCreateFolder(name: string): Promise<void> {
        const trimmed = name.trim();
        if (!trimmed) {
            throw new Error("Введите название папки");
        }
        if (trimmed.length > MAX_NAME_LENGTH) {
            throw new Error(`Название папки не должно превышать ${MAX_NAME_LENGTH} символов`);
        }

        if (this.isDuplicateName(trimmed)) {
            throw new Error("Папка с таким названием уже существует");
        }

        await createFolder(trimmed);
        await this.loadFolders();
    }

    private closeCreateFolderModal(): void {
        void this.createFolderModal?.unmount();
        this.createFolderModal = null;
        if (this.modalHost) {
            this.modalHost.remove();
            this.modalHost = null;
        }
    }

    private isProtectedFolder(folder: FolderSummary): boolean {
        return folder.type !== "custom" || SIDEBAR_TEXTS.defaultFolders.some((f) => f.id === folder.id);
    }

    private resolveFolderIcon(folder: FolderSummary): string {
        const systemIcon = SIDEBAR_TEXTS.defaultFolders.find(
            (f) => f.id === folder.id || f.id === folder.type
        )?.icon;
        return folder.icon ?? systemIcon ?? "/img/folder-custom.svg";
    }

    private handleNameInput(folderId: string, value: string, counter: HTMLElement): void {
        if (this.editingId !== folderId) {
            this.editingId = folderId;
        }
        this.editingValue = value;
        this.updateCounter(counter, MAX_NAME_LENGTH - value.length);
        this.updateAcceptButtonState(folderId);
        this.updateSaveButtonState();
        if (this.isDuplicateName(value, folderId)) {
            this.setError("Папка с таким названием уже существует");
        } else if (this.errorEl?.textContent === "Папка с таким названием уже существует") {
            this.setError("");
        }
    }

    private getContentRoot(): HTMLElement | null {
        return this.element?.querySelector('[data-slot="content"]') as HTMLElement | null;
    }

    private updateSaveButtonState(): void {
        if (!this.saveBtn) return;
        const disabled = this.saving || this.hasNameOverflow() || this.hasDuplicateNames();
        this.saveBtn.setProps({ disabled });
    }

    private hasNameOverflow(): boolean {
        if (this.editingValue && this.editingValue.length > MAX_NAME_LENGTH) {
            return true;
        }
        for (const name of this.renameDrafts.values()) {
            if (name.length > MAX_NAME_LENGTH) {
                return true;
            }
        }
        return false;
    }

    private hasDuplicateNames(): boolean {
        const seen = new Map<string, string>();
        for (const folder of this.folders) {
            const name = this.renameDrafts.get(folder.id) ?? folder.name;
            const norm = this.normalizeName(name);
            if (!norm) continue;
            if (seen.has(norm) && seen.get(norm) !== folder.id) {
                return true;
            }
            seen.set(norm, folder.id);
        }
        return false;
    }

    private updateAcceptButtonState(folderId: string): void {
        const row = this.rowsMap.get(folderId);
        if (!row) return;
        const btn = row.querySelector<HTMLButtonElement>('[data-action="accept"]');
        if (!btn) return;
        const name = this.editingId === folderId ? this.editingValue ?? "" : this.renameDrafts.get(folderId) ?? "";
        const disabled = name.length > MAX_NAME_LENGTH || this.isDuplicateName(name, folderId);
        btn.disabled = disabled;
        btn.classList.toggle("interface-settings__icon-btn--disabled", disabled);
    }

    private normalizeName(name: string): string {
        return name.trim().toLowerCase();
    }

    private isDuplicateName(name: string, excludeId?: string): boolean {
        const target = this.normalizeName(name);
        if (!target) return false;

        for (const folder of this.folders) {
            if (excludeId && folder.id === excludeId) {
                continue;
            }
            const finalName = this.renameDrafts.get(folder.id) ?? folder.name;
            const normalized = this.normalizeName(finalName);
            if (!normalized) continue;
            if (normalized === target) {
                return true;
            }
        }

        return false;
    }

    private renderThemeContent(): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.className = "interface-settings__theme";
        this.themeRoot = wrapper;

        const title = document.createElement("p");
        title.className = "interface-settings__theme-title";
        title.textContent = "Выберите тему оформления";
        wrapper.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "interface-settings__theme-grid";
        wrapper.appendChild(grid);

        THEME_ORDER.forEach((id) => {
            const preset = THEME_PRESETS[id];
            const card = document.createElement("button");
            card.type = "button";
            card.className = "interface-settings__theme-card";
            card.setAttribute("data-theme-id", id);
            if (id === this.currentTheme) {
                card.classList.add("interface-settings__theme-card--active");
            }
            card.onclick = () => this.handleThemeSelect(id);

            const info = document.createElement("div");
            info.className = "interface-settings__theme-info";

            const name = document.createElement("div");
            name.className = "interface-settings__theme-name";
            name.textContent = preset.name;

            const desc = document.createElement("div");
            desc.className = "interface-settings__theme-desc";
            desc.textContent = preset.description;

            info.append(name, desc);

            const swatches = document.createElement("div");
            swatches.className = "interface-settings__theme-swatches";
            [preset.colors.bg, preset.colors.panel, preset.colors.text].forEach((color) => {
                const swatch = document.createElement("span");
                swatch.className = "interface-settings__theme-swatch";
                swatch.style.backgroundColor = color;
                swatches.appendChild(swatch);
            });

            card.append(info, swatches);
            grid.appendChild(card);
        });

        return wrapper;
    }

    private handleThemeSelect(theme: ThemeId): void {
        if (theme === this.currentTheme) {
            return;
        }
        this.applyTheme(theme);
    }

    private applyTheme(theme: ThemeId, persist = true): void {
        const preset = THEME_PRESETS[theme];
        if (!preset) return;
        const root = document.documentElement;
        root.style.setProperty("--color-bg", preset.colors.bg);
        root.style.setProperty("--color-panel", preset.colors.panel);
        root.style.setProperty("--color-text", preset.colors.text);
        root.style.setProperty("--color-muted", preset.colors.muted);
        root.style.setProperty("--color-border", preset.colors.border);
        root.setAttribute("data-theme", theme);
        if (persist) {
            try {
                localStorage.setItem(THEME_STORAGE_KEY, theme);
            } catch {
                // ignore
            }
        }
        this.currentTheme = theme;
        this.updateThemeActiveState();
    }

    private updateThemeActiveState(): void {
        if (!this.themeRoot) return;
        this.themeRoot.querySelectorAll<HTMLButtonElement>(".interface-settings__theme-card").forEach((card) => {
            const id = card.getAttribute("data-theme-id");
            card.classList.toggle("interface-settings__theme-card--active", id === this.currentTheme);
        });
    }

    private readStoredTheme(): ThemeId {
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
            if (stored && THEME_ORDER.includes(stored)) {
                return stored;
            }
        } catch {
            // ignore
        }
        return "light";
    }
}
