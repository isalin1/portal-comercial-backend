import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    return await this.prisma.department.create({ data: createDepartmentDto});
  }

  async findAll() {
    return await this.prisma.department.findMany();
  }

  async findOne(id: number) {
    const department = await this.prisma.department.findUnique ({
      where: { id },
    })
    if (!department) {
      throw new NotFoundException(`No se encontro elemento con id ${id}`);
    }
    return department;
    
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    await this.findOne(id);

    const department = await this.prisma.department.update({
      where: {id },
      data: updateDepartmentDto
    })

    return department;
  }

  async remove(id: number) {
    await this.findOne(id);

    return await this.prisma.department.delete({ where: { id } });
  }
}
