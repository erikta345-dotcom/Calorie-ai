import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string, name: string) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: "Calorie AI <noreply@calorieai.app>",
    to,
    subject: "¡Bienvenido a Calorie AI! 🥗",
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#18181b;border-radius:16px;overflow:hidden">
        <tr>
          <td style="background:#09090b;padding:32px;text-align:center;border-bottom:1px solid #27272a">
            <p style="margin:0;font-size:32px">🥗</p>
            <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700">Calorie AI</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 12px;color:#ffffff;font-size:18px;font-weight:600">Hola, ${name} 👋</h2>
            <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6">
              ¡Bienvenido a <strong style="color:#ffffff">Calorie AI</strong>! Ya puedes empezar a registrar tus comidas, escanear fotos de tus platos y alcanzar tus objetivos.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;width:100%">
              <tr>
                <td style="background:#27272a;border-radius:12px;padding:16px">
                  <p style="margin:0 0 8px;color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Lo que puedes hacer</p>
                  <p style="margin:4px 0;color:#d4d4d8;font-size:14px">📷 &nbsp;Escanear comidas con IA</p>
                  <p style="margin:4px 0;color:#d4d4d8;font-size:14px">🔍 &nbsp;Buscar alimentos por código de barras</p>
                  <p style="margin:4px 0;color:#d4d4d8;font-size:14px">📊 &nbsp;Ver tu historial de 7 días</p>
                  <p style="margin:4px 0;color:#d4d4d8;font-size:14px">🔔 &nbsp;Alertas y recordatorios personalizados</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;color:#a1a1aa;font-size:14px;line-height:1.6">
              Empieza configurando tu peso, altura y objetivo en <strong style="color:#ffffff">Ajustes</strong> para obtener tus macros personalizados.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#22c55e;border-radius:10px;padding:12px 28px">
                  <a href="${process.env.NEXTAUTH_URL || "https://calorie-ai.vercel.app"}" style="color:#09090b;font-size:15px;font-weight:700;text-decoration:none">Abrir la app →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #27272a;text-align:center">
            <p style="margin:0;color:#52525b;font-size:12px">Has recibido este correo porque creaste una cuenta en Calorie AI.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
