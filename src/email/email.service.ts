import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  private brandFrom() {
    return this.configService.get<string>('EMAIL_USER') || 'noreply@rednegocios.local';
  }

  private frontendUrl() {
    return (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173').replace(/\/$/, '');
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl()}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: this.brandFrom(),
      to: email,
      subject: 'Verifica tu cuenta - Red de Negocios Valdiviezo',
      html: `
        <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e21221;">¡Bienvenido a Red de Negocios Valdiviezo!</h2>
          <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el siguiente enlace:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}"
               style="background-color: #e21221; color: white; padding: 12px 30px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 700;">
              Verificar Cuenta
            </a>
          </div>
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>Este enlace expirará en 24 horas.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Si no solicitaste este registro, puedes ignorar este correo.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error enviando email de verificación:', error);
      throw new Error('No se pudo enviar el email de verificación');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.frontendUrl()}/restablecer-contrasena?token=${encodeURIComponent(resetToken)}`;

    const mailOptions = {
      from: this.brandFrom(),
      to: email,
      subject: 'Restablecer contraseña - Red de Negocios Valdiviezo',
      html: `
        <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e21221;">Restablecer contraseña</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #e21221; color: white; padding: 12px 30px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 700;">
              Restablecer contraseña
            </a>
          </div>
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>Este enlace expirará en 1 hora y solo puede usarse una vez.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Si no solicitaste restablecer tu contraseña, ignora este correo. Tu cuenta seguirá segura.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error enviando email de restablecimiento:', error);
      throw new Error('No se pudo enviar el email de restablecimiento');
    }
  }
}
