fetch('/inbox') // TODO: заменить на реальный URL
  .then(response => response.json())
  .then(data => {
    

    // Передача данных в контекст
    const source = document.getElementById('messages-template').innerHTML;
    const template = Handlebars.compile(source);
    const html = template(data);

    document.getElementById('messages-list').innerHTML = html;
  })
  .catch(error => {
    console.error('Ошибка при получении данных:', error);
  });