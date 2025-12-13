import { Component } from "@shared/base/Component";
import { ButtonComponent } from "@shared/components/Button/Button";
import template from "./ComposeModal.hbs";
import "./ComposeModal.scss";
import { validateRecipientAddress } from "@utils";
import { COMPOSE_MODAL_TEXTS } from "@shared/constants/texts";

// Локальный payload: базовые поля письма
type ComposePayload = {
  to: string;
  subject: string;
  body: string;
};

type Props = {
  onClose?: () => void;
  onSend?: (data: ComposePayload & { attachments?: File[] }) => void;
  onAttachFile?: () => void;
  onSaveDraft?: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  focusField?: "to" | "subject" | "body";
};

export class ComposeModal extends Component<Props> {
  private readonly attachButton: ButtonComponent;
  private readonly draftButton: ButtonComponent;
  private readonly sendButton: ButtonComponent;

  private toInput: HTMLInputElement | null = null;
  private toErrorEl: HTMLElement | null = null;
  private subjectInput: HTMLInputElement | null = null;
  private bodyTextarea: HTMLTextAreaElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private attachmentsList: HTMLElement | null = null;
  private attachments: File[] = [];

  constructor(props: Props = {}) {
    super(props);

    this.attachButton = new ButtonComponent({
      label: COMPOSE_MODAL_TEXTS.attachFile,
      variant: "link",
      icon: '<img src="/img/modal-attach-file.svg" alt="" aria-hidden="true" />',
      onClick: () => this.handleAttach(),
    });

    this.draftButton = new ButtonComponent({
      label: COMPOSE_MODAL_TEXTS.saveDraft,
      variant: "link",
      icon: '<img src="/img/modal-to-draft.svg" alt="" aria-hidden="true" />',
      onClick: () => this.handleSaveDraft(),
    });

    this.sendButton = new ButtonComponent({
      label: COMPOSE_MODAL_TEXTS.send,
      variant: "primary",
      onClick: () => this.handleSend(),
    });
  }

  protected renderTemplate(): string {
    console.log("ComposeModal renderTemplate");
    return template({});
  }

  protected afterRender(): void {
    console.log("ComposeModal afterRender");
    const root = this.element as HTMLElement;

    root.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).classList.contains("compose-overlay")) {
        this.props.onClose?.();
      }
    });

    const closeBtn = root.querySelector('[data-action="close"]') as HTMLElement | null;
    closeBtn?.addEventListener("click", () => this.props.onClose?.());

    this.mountButton(root, "attach", this.attachButton);
    this.mountButton(root, "draft", this.draftButton);
    this.mountButton(root, "send", this.sendButton);

    this.toInput = root.querySelector('[data-field="to"]') as HTMLInputElement | null;
    this.toErrorEl = root.querySelector('[data-error="to"]') as HTMLElement | null;
    this.subjectInput = root.querySelector('[data-field="subject"]') as HTMLInputElement | null;
    this.bodyTextarea = root.querySelector('[data-field="body"]') as HTMLTextAreaElement | null;
    this.fileInput = root.querySelector('[data-file-input]') as HTMLInputElement | null;
    this.attachmentsList = root.querySelector('[data-attachments-list]') as HTMLElement | null;

    if (this.fileInput) {
      this.fileInput.addEventListener("change", (e) => this.handleFileSelect(e));
    }

    if (this.toInput) {
      this.toInput.addEventListener("input", () => this.setRecipientError(null));
    }
    if (this.toErrorEl) {
      this.toErrorEl.classList.remove("compose-modal__error--visible");
      this.toErrorEl.textContent = "";
    }

    this.applyInitialValues();
    this.focusInitialField();
    this.renderAttachmentsList(); // чтобы сразу показать "Нет вложений"
  }

  private mountButton(root: HTMLElement, slotName: string, button: ButtonComponent): void {
    const slot = root.querySelector(`[data-slot="${slotName}"]`) as HTMLElement | null;
    if (!slot) {
      return;
    }
    button.render();
    void button.mount(slot);
  }

  private handleSend(): void {
    const to = this.toInput?.value ?? "";
    const subject = this.subjectInput?.value ?? "";
    const body = this.bodyTextarea?.value ?? "";

    const recipientError = validateRecipientAddress(to);
    this.setRecipientError(recipientError);
    if (recipientError) {
      this.toInput?.focus();
      return;
    }

    this.props.onSend?.({
      to,
      subject,
      body,
      attachments: this.attachments,
    });
  }

  private applyInitialValues(): void {
    if (this.toInput) {
      this.toInput.value = this.props.initialTo ?? "";
    }
    this.setRecipientError(null);

    if (this.subjectInput) {
      this.subjectInput.value = this.props.initialSubject ?? "";
    }

    if (this.bodyTextarea) {
      this.bodyTextarea.value = this.props.initialBody ?? "";
    }
  }

  private focusInitialField(): void {
    const focus = this.props.focusField ?? "to";
    let target: HTMLInputElement | HTMLTextAreaElement | null;

    if (focus === "subject") {
      target = this.subjectInput;
    } else if (focus === "body") {
      target = this.bodyTextarea;
    } else {
      target = this.toInput;
    }

    target?.focus();
    if (focus === "body" && this.bodyTextarea) {
      const length = this.bodyTextarea.value.length;
      this.bodyTextarea.setSelectionRange(length, length);
    }
  }

  private handleAttach(): void {
    if (this.props.onAttachFile) {
      this.props.onAttachFile();
    }
    this.fileInput?.click();
  }

  private handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      if (file && !this.attachments.some((f) => f.name === file.name && f.size === file.size)) {
        this.attachments.push(file);
      }
    }

    this.renderAttachmentsList();
    input.value = "";
  }

  private renderAttachmentsList(): void {
    if (!this.attachmentsList) return;
  
    if (this.attachments.length === 0) {
      this.attachmentsList.innerHTML = '<div class="attachments-empty">Нет вложений</div>';
      return;
    }
  
    const itemsHtml = this.attachments
      .map((file, index) => {
        const name = file.name;
        const dotIndex = name.lastIndexOf(".");
        const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
        const ext = dotIndex > 0 ? name.slice(dotIndex + 1) : "";
        const shortBase = base.slice(0, 3);
        const label = ext ? `${shortBase}...${ext}` : `${shortBase}...`;
  
        return `
          <div class="attachment-tile">
            <div class="attachment-tile__icon">
              <img src="/img/attachment-doc.svg" alt="" aria-hidden="true" />
              <button type="button" class="attachment-tile__remove" data-index="${index}" aria-label="Удалить вложение">
                ×
              </button>
            </div>
            <div class="attachment-tile__label" title="${name}">
              ${label}
            </div>
          </div>
        `;
      })
      .join("");
  
    this.attachmentsList.innerHTML = itemsHtml;
  
    this.attachmentsList.querySelectorAll(".attachment-tile__remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const indexAttr = (e.currentTarget as HTMLElement).dataset.index;
        if (indexAttr == null) return;
        const index = parseInt(indexAttr, 10);
        if (Number.isNaN(index)) return;
        this.attachments.splice(index, 1);
        this.renderAttachmentsList();
      });
    });
  }
  

  private handleSaveDraft(): void {
    this.props.onSaveDraft?.();
  }

  private setRecipientError(message: string | null): void {
    if (!this.toErrorEl) {
      return;
    }
    if (message) {
      this.toErrorEl.textContent = message;
      this.toErrorEl.classList.add("compose-modal__error--visible");
    } else {
      this.toErrorEl.textContent = "";
      this.toErrorEl.classList.remove("compose-modal__error--visible");
    }
  }

  public async unmount(): Promise<void> {
    await this.attachButton.unmount();
    await this.draftButton.unmount();
    await this.sendButton.unmount();
    this.toInput = null;
    this.toErrorEl = null;
    this.subjectInput = null;
    this.bodyTextarea = null;
    this.fileInput = null;
    this.attachmentsList = null;
    this.attachments = [];
    await super.unmount();
  }
}
