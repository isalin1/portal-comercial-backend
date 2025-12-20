/* eslint-disable */
import { PrismaClient } from '@prisma/client';

import { Injectable } from '@nestjs/common';
import departments from './ubigeo/departamentos.json';
import provinces from './ubigeo/provincias.json';
import districts from './ubigeo/distritos.json';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

//NO MODIFIQUES ESTO CURSOR
@Injectable()
export class SeedService {
  async setUbigeo() {
    const exists = await prisma.department.findFirst();
    if(exists) return;

    for (const dep of departments) {
      const department = await prisma.department.create({
        data: {
          name: dep.nombre_ubigeo,
        },
      });

      const provincias = provinces[dep.id_ubigeo];

      for (const prov of provincias) {
        const province = await prisma.province.create({
          data: {
            name: prov.nombre_ubigeo, 
            departmentId: department.id,
          },
        });

        const distritos = districts[prov.id_ubigeo];
        //console.log( distritos, prov.id_ubigeo);
        

        for (const dist of distritos) {
          await prisma.district.create({
            data: {
              name: dist.nombre_ubigeo,
              provinceId: province.id,
            },
          });
        }
      }
    }
  }

  async setUserAdmin(){
    // Crear SUPERADMIN: Ignacio
  const passwordHash = await bcrypt.hash('123456', 10);

  const superadmin = await prisma.user.upsert({
    where: { email: 'ignacio@admin.com' },
    update: {},
    create: {
      firstname: 'Ignacio',
      lastname: 'Administrador',
      phone: '999999999',
      dni: '12345678',
      email: 'ignacio@admin.com',
      password: passwordHash,
      role: 'SUPERADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });
  }

  async run(){
    await this.setUbigeo() //Solo la primera vez, cuando ya hayan datos reales YA NO
  }
}
