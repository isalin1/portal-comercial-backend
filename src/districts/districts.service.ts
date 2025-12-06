import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DistrictsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDistrictDto: CreateDistrictDto) {
    return await this.prisma.district.create({ data: createDistrictDto });
  }

  async findAll() {
    return await this.prisma.district.findMany({
      include: {
        province: {
          include: {
            department: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    // Validar que el ID sea un número válido
    if (isNaN(id)) {
      throw new BadRequestException('El ID debe ser un número válido.');
    }
    const district = await this.prisma.district.findUnique({
      where: { id },
      include: {
        province: {
          include: {
            department: true,
          },
        },
      },
    });
    if (!district) {
      throw new NotFoundException(`No se encontro elemento con id ${id}`);
    }
    return district;
  }

  async update(id: number, updateDistrictDto: UpdateDistrictDto) {
    await this.findOne(id);

    const district = await this.prisma.district.update({
      where: { id },
      data: updateDistrictDto,
    });

    return district;
  }

  async remove(id: number) {
    // Verificar que el registro exista antes de eliminarlo. si no se encuentra, meotdo findOne lanza la excepcion
    await this.findOne(id);

    //Eliminar el registro
    return await this.prisma.district.delete({ where: { id } });
  }
} 