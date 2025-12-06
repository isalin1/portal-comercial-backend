import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
//import { prisma } from 'src/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProvincesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProvinceDto: CreateProvinceDto) {
    return await this.prisma.province.create({ data: createProvinceDto })
  }

  async findAll() {
    return await this.prisma.province.findMany({
      include:{
        department: true,
      }
    });
  }

  async findOne(id: number) {
      // Validar que el ID sea un número válido
    if (isNaN(id)) {
    throw new BadRequestException('El ID debe ser un número válido.');
  }
    //buscar la provincia con su departamento relacionado
    const province = await this.prisma.province.findUnique({
      where: {id},
      include:{
        department: true,
      }
    })

    //Lanzar excepcion si no se encuentra provincia
        if (!province) {
          throw new NotFoundException(`No se encontro elemento con id ${id}`);
        }

        //retorna la provincia solicitado, incluyendo el departamento relacionado
        return province;

  }

  async update(id: number, updateProvinceDto: UpdateProvinceDto) {
    await this.findOne(id);

    const province = await this.prisma.province.update({
      where: {id},
      data: updateProvinceDto
    })

    return province;
  }

  async remove(id: number) {
    // Verificar que el registro exista antes de eliminarlo. si no se encuentra, meotdo findOne lanza la excepcion
    await this.findOne(id);

    //Eliminar el registro
    return await this.prisma.province.delete({ where: { id } });
  }
}
