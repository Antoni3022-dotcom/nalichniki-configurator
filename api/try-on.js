import OpenAI, { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Используйте POST-запрос",
    });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "В Vercel не настроен OPENAI_API_KEY",
      });
    }

    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const { imageBase64, mimeType, color } = body || {};

    if (!imageBase64) {
      return res.status(400).json({
        error: "Не получена фотография дома",
      });
    }

    const colors = {
      white: "чистый белый цвет",
      "RAL 9016": "белый RAL 9016",
      "RAL 8017": "коричневый RAL 8017",
      "RAL 8019": "серо-коричневый RAL 8019",
      "RAL 7024": "графитовый серый RAL 7024",
    };

    const selectedColor = colors[color] || colors.white;

    const cleanBase64 = imageBase64.replace(
      /^data:image\/[^;]+;base64,/,
      ""
    );

    const imageBuffer = Buffer.from(cleanBase64, "base64");

    if (imageBuffer.length > 4 * 1024 * 1024) {
      return res.status(413).json({
        error: "Фотография слишком большая. Максимум 4 МБ.",
      });
    }

    const fileType = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(mimeType)
      ? mimeType
      : "image/jpeg";

    const extension =
      fileType === "image/png"
        ? "png"
        : fileType === "image/webp"
        ? "webp"
        : "jpg";

    const imageFile = await toFile(
      imageBuffer,
      `house.${extension}`,
      { type: fileType }
    );

    const prompt = `
Отредактируй фотографию деревянного дома для визуализации
деревянных оконных наличников.

Задача:
Добавь классические деревянные наличники вокруг существующих окон.
Цвет наличников: ${selectedColor}.

Критически важно:
1. Сохрани исходную фотографию дома и её композицию.
2. Не меняй количество, форму, размеры и положение окон.
3. Не изменяй оконные рамы, стекло, уплотнители, защитную плёнку
   и отражения в стёклах.
4. Не меняй стены, брёвна, крышу, освещение и фон.
5. Добавляй наличники только по внешнему периметру оконных рам.
6. Наличники должны выглядеть как реальные деревянные детали,
   установленные поверх фасада.
7. Не закрашивай стекло и оконные рамы.
8. Не добавляй новые окна, двери или декоративные элементы.
9. Используй выбранный цвет только для новых наличников.

Верни отредактированное изображение.
`;

    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
      size: "auto",
    });

    const generatedImage = result.data?.[0]?.b64_json;

    if (!generatedImage) {
      throw new Error("OpenAI не вернул изображение");
    }

    return res.status(200).json({
      success: true,
      imageDataUrl: `data:image/png;base64,${generatedImage}`,
    });
  } catch (error) {
    console.error("Try-on error:", error);

    return res.status(500).json({
      error: "Не удалось обработать фотографию.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}
