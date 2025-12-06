import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // o 'outlook', 'yahoo', etc.
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'), // Contraseña de aplicación
      },
    });
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: 'Verifica tu cuenta - Lavandería',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff7a2f;">¡Bienvenido a Lavandería!</h2>
          <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el siguiente enlace:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #ff7a2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
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
      console.log(`✅ Email de verificación enviado a: ${email}`);
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      throw new Error('No se pudo enviar el email de verificación');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: 'Restablecer Contraseña - Lavandería',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff7a2f;">Restablecer Contraseña</h2>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #ff7a2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>Este enlace expirará en 1 hora.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de restablecimiento enviado a: ${email}`);
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      throw new Error('No se pudo enviar el email de restablecimiento');
    }
  }
} 