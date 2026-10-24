export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Используйте POST-запрос"
    });
  }

  return res.status(501).json({
    error: "Обработчик создан, но обработка изображений ещё не подключена."
  });
}
