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

  async setUserAdmin() {
    const passwordHash = await bcrypt.hash('123456', 10);

    const existing = await prisma.datUser.findUnique({
      where: { email: 'ignacio@admin.com' },
    });

    if (existing) return;

    await prisma.datUser.create({
      data: {
        firstName: 'Ignacio',
        lastName: 'Administrador',
        email: 'ignacio@admin.com',
        phone: '999999999',
        userType: 'ADMIN',
        user: {
          create: {
            password: passwordHash,
            isActive: true,
          },
        },
      },
    });
  }

  async setRubros() {
    const exists = await prisma.rubro.findFirst();
    if (exists) return;

    const catalogs = [
      {
        name: 'Alimentos y Antojos',
        categories: [
          'Pollerías',
          'Postres y dulces',
          'Sánguches y hamburguesas',
        ],
      },
      {
        name: 'Comercios y Servicios',
        categories: ['Minimarket', 'Servicios locales'],
      },
      {
        name: 'Profesionales y Técnicos Independientes',
        categories: ['Profesionales', 'Técnicos'],
      },
    ];

    for (const rubro of catalogs) {
      await prisma.rubro.create({
        data: {
          name: rubro.name,
          categories: {
            create: rubro.categories.map((name) => ({ name })),
          },
        },
      });
    }
  }

  async run() {
    await this.setUbigeo(); //Solo la primera vez, cuando ya hayan datos reales YA NO
    await this.setUserAdmin();
    await this.setRubros();
  }
}
