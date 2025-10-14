export class InboxPage {
  async render() {
    // Имитация загрузки данных
    const emails = await this.loadEmails();

    const template = `
      <div class="inbox-page">
        <div class="page-header">
          <h2>Inbox</h2>
          <button class="btn btn-primary">Compose</button>
        </div>
        
        <div class="email-list">
          ${emails.map(email => `
            <div class="email-item ${email.unread ? 'email-item--unread' : ''}">
              <div class="email-checkbox">
                <input type="checkbox">
              </div>
              <div class="email-sender">${email.sender}</div>
              <div class="email-subject">
                ${email.subject}
                ${email.unread ? '<span class="unread-dot"></span>' : ''}
              </div>
              <div class="email-time">${email.time}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = template;

    return element;
  }

  async loadEmails() {
    // Имитация API запроса
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          {
            id: 1,
            sender: 'John Doe',
            subject: 'Meeting Tomorrow',
            preview: 'Don\'t forget about the meeting at 10 AM...',
            time: '10:30 AM',
            unread: true
          },
          {
            id: 2,
            sender: 'Jane Smith',
            subject: 'Project Update',
            preview: 'The project is going well and we are on track...',
            time: '9:15 AM',
            unread: true
          },
          {
            id: 3,
            sender: 'Support Team',
            subject: 'Your ticket has been updated',
            preview: 'We have updated your support ticket...',
            time: 'Yesterday',
            unread: false
          }
        ]);
      }, 500);
    });
  }
}