import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  // Método auxiliar para formatear fechas en formato YYYY-MM-DD
  private formatDateForResponse(date: Date | string): string {
    if (!date) return '';
    
    let dateObj: Date;
    if (typeof date === 'string') {
      // Si es string, puede venir como ISO string o como YYYY-MM-DD
      if (date.includes('T')) {
        // Es un ISO string, parsearlo
        dateObj = new Date(date);
      } else {
        // Ya es YYYY-MM-DD, devolverlo directamente
        return date;
      }
    } else {
      dateObj = date;
    }
    
    // Usar métodos UTC para obtener la fecha correcta sin importar la zona horaria
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    
    console.log('📅 Formateando fecha:', date, '->', formatted, 'UTC:', dateObj.toISOString());
    return formatted;
  }

  async create(createExpenseDto: CreateExpenseDto) {
    try {
      // Verificar que el punto de venta existe
      const pointsale = await this.prisma.pointSale.findUnique({
        where: { id: createExpenseDto.pointsaleId },
      });

      if (!pointsale) {
        throw new NotFoundException(`Punto de venta con ID ${createExpenseDto.pointsaleId} no encontrado`);
      }

      // Validar que la fecha no sea mayor a hoy
      const dateString = createExpenseDto.date;
      console.log('🔵 [CREATE] Fecha recibida del frontend (string):', dateString);
      const [year, month, day] = dateString.split('-').map(Number);
      console.log('🔵 [CREATE] Año, Mes, Día parseados:', year, month, day);
      
      // Usar mediodía UTC para evitar problemas de zona horaria
      // Esto asegura que la fecha siempre esté en el día correcto independientemente de la zona horaria
      const expenseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      
      // Validar que la fecha no sea mayor a hoy
      // Usar la fecha local del servidor, no UTC
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Comparar solo las fechas (sin hora)
      const expenseDateOnly = new Date(expenseDate);
      expenseDateOnly.setUTCHours(0, 0, 0, 0);
      const todayOnly = new Date(today);
      todayOnly.setHours(0, 0, 0, 0);
      
      if (expenseDateOnly > todayOnly) {
        throw new BadRequestException('No se pueden registrar gastos con fechas futuras. La fecha máxima permitida es hoy.');
      }
      console.log('🔵 [CREATE] Fecha UTC creada (Date object):', expenseDate);
      console.log('🔵 [CREATE] Fecha UTC ISO string:', expenseDate.toISOString());
      console.log('🔵 [CREATE] Fecha UTC timestamp:', expenseDate.getTime());
      console.log('🔵 [CREATE] Fecha UTC getUTCFullYear/Month/Date:', 
        expenseDate.getUTCFullYear(), expenseDate.getUTCMonth() + 1, expenseDate.getUTCDate());
      
      const expense = await this.prisma.expense.create({
        data: {
          pointsaleId: createExpenseDto.pointsaleId,
          date: expenseDate,
          recipient: createExpenseDto.recipient.trim(),
          concept: createExpenseDto.concept.trim(),
          amount: createExpenseDto.amount,
        },
        include: {
          pointsale: true,
        },
      });

      // Verificar qué fecha se guardó realmente en la base de datos
      console.log('🟢 [CREATE] Fecha devuelta por Prisma (tipo):', typeof expense.date, expense.date instanceof Date ? 'Date' : 'otro');
      console.log('🟢 [CREATE] Fecha devuelta por Prisma (valor):', expense.date);
      if (expense.date instanceof Date) {
        console.log('🟢 [CREATE] Fecha Prisma toISOString():', expense.date.toISOString());
        console.log('🟢 [CREATE] Fecha Prisma getUTCFullYear/Month/Date:', 
          expense.date.getUTCFullYear(), expense.date.getUTCMonth() + 1, expense.date.getUTCDate());
        console.log('🟢 [CREATE] Fecha Prisma getFullYear/Month/Date (local):', 
          expense.date.getFullYear(), expense.date.getMonth() + 1, expense.date.getDate());
      }
      return {
        ...expense,
        date: dateString, // Usar la fecha original del frontend
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al crear el gasto: ' + error.message);
    }
  }

  async findAll(params?: { pointsaleId?: number; date?: string }) {
    const where: any = {};

    if (params?.pointsaleId) {
      where.pointsaleId = params.pointsaleId;
    }

    if (params?.date) {
      // Crear rango de fechas en UTC para evitar problemas de zona horaria
      console.log('🟠 [FINDALL] Fecha recibida para filtrar:', params.date);
      const [year, month, day] = params.date.split('-').map(Number);
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      console.log('🟠 [FINDALL] Rango de fechas UTC:', {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
      });
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        pointsale: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Formatear las fechas para evitar problemas de zona horaria en el frontend
    return expenses.map(expense => {
      // Extraer la fecha del objeto Date que Prisma devuelve
      // IMPORTANTE: Usar métodos UTC para obtener la fecha correcta sin importar la zona horaria del servidor
      let dateString = '';
      if (expense.date) {
        console.log('🟡 [FINDALL] Fecha de Prisma (tipo):', typeof expense.date, expense.date instanceof Date ? 'Date' : 'otro');
        console.log('🟡 [FINDALL] Fecha de Prisma (valor):', expense.date);
        if (expense.date instanceof Date) {
          // Obtener la fecha usando métodos UTC para evitar problemas de zona horaria
          const year = expense.date.getUTCFullYear();
          const month = String(expense.date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(expense.date.getUTCDate()).padStart(2, '0');
          dateString = `${year}-${month}-${day}`;
          
          console.log('🟡 [FINDALL] Fecha Prisma toISOString():', expense.date.toISOString());
          console.log('🟡 [FINDALL] Fecha Prisma getUTCFullYear/Month/Date:', year, month, day);
          console.log('🟡 [FINDALL] Fecha Prisma getFullYear/Month/Date (local):', 
            expense.date.getFullYear(), expense.date.getMonth() + 1, expense.date.getDate());
          console.log('🟡 [FINDALL] Fecha extraída usando UTC:', dateString);
        } else if (typeof expense.date === 'string') {
          // Si ya es string, extraer la parte de la fecha
          const dateStr = expense.date as string;
          dateString = dateStr.split('T')[0];
          console.log('🟡 [FINDALL] Fecha extraída de string:', dateString);
        }
        console.log('🟡 [FINDALL] Fecha extraída final:', dateString);
      }
      return {
        ...expense,
        date: dateString,
      };
    });
  }

  async findOne(id: number) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        pointsale: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado`);
    }

    // Formatear la fecha para la respuesta usando toISOString para obtener UTC
    let dateString = '';
    if (expense.date instanceof Date) {
      dateString = expense.date.toISOString().split('T')[0];
    } else if (typeof expense.date === 'string') {
      const dateStr = expense.date as string;
      dateString = dateStr.split('T')[0];
    }
    console.log('📅 Fecha extraída (findOne):', expense.date, '->', dateString);
    return {
      ...expense,
      date: dateString,
    };
  }

  async update(id: number, updateExpenseDto: UpdateExpenseDto) {
    try {
      const expense = await this.prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new NotFoundException(`Gasto con ID ${id} no encontrado`);
      }

      const updateData: any = {};

      if (updateExpenseDto.recipient !== undefined) {
        updateData.recipient = updateExpenseDto.recipient.trim();
      }

      if (updateExpenseDto.concept !== undefined) {
        updateData.concept = updateExpenseDto.concept.trim();
      }

      if (updateExpenseDto.amount !== undefined) {
        updateData.amount = updateExpenseDto.amount;
      }

      if (updateExpenseDto.date !== undefined) {
        // Validar que la fecha no sea mayor a hoy
        const [year, month, day] = updateExpenseDto.date.split('-').map(Number);
        const expenseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        
        // Usar la fecha local del servidor, no UTC
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Comparar solo las fechas (sin hora)
        const expenseDateOnly = new Date(expenseDate);
        expenseDateOnly.setUTCHours(0, 0, 0, 0);
        const todayOnly = new Date(today);
        todayOnly.setHours(0, 0, 0, 0);
        
        if (expenseDateOnly > todayOnly) {
          throw new BadRequestException('No se pueden actualizar gastos con fechas futuras. La fecha máxima permitida es hoy.');
        }
        
        // Asegurar que la fecha se actualice correctamente sin problemas de zona horaria
        updateData.date = expenseDate;
      }

      if (updateExpenseDto.pointsaleId !== undefined) {
        // Verificar que el punto de venta existe
        const pointsale = await this.prisma.pointSale.findUnique({
          where: { id: updateExpenseDto.pointsaleId },
        });

        if (!pointsale) {
          throw new NotFoundException(`Punto de venta con ID ${updateExpenseDto.pointsaleId} no encontrado`);
        }

        updateData.pointsaleId = updateExpenseDto.pointsaleId;
      }

      const updatedExpense = await this.prisma.expense.update({
        where: { id },
        data: updateData,
        include: {
          pointsale: true,
        },
      });

      // Formatear la fecha para la respuesta
      let dateString = '';
      if (updatedExpense.date instanceof Date) {
        dateString = updatedExpense.date.toISOString().split('T')[0];
      } else if (typeof updatedExpense.date === 'string') {
        const dateStr = updatedExpense.date as string;
        dateString = dateStr.split('T')[0];
      } else if (updateExpenseDto.date) {
        // Si se actualizó la fecha, usar la del DTO
        dateString = updateExpenseDto.date;
      }
      console.log('📅 Fecha extraída (update):', updatedExpense.date, '->', dateString);
      return {
        ...updatedExpense,
        date: dateString,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al actualizar el gasto');
    }
  }

  async remove(id: number) {
    try {
      const expense = await this.prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new NotFoundException(`Gasto con ID ${id} no encontrado`);
      }

      await this.prisma.expense.delete({
        where: { id },
      });

      return { message: 'Gasto eliminado correctamente' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar el gasto');
    }
  }
}

