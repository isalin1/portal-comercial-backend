import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Datos de Perú: Departamentos, Provincias y Distritos principales
const peruData = [
  {
    department: 'Amazonas',
    provinces: [
      { name: 'Chachapoyas', districts: ['Chachapoyas', 'Asunción', 'Balsas', 'Cheto', 'Chiliquin', 'Chuquibamba', 'Granada', 'Huancas', 'La Jalca', 'Leimebamba', 'Levanto', 'Magdalena', 'Mariscal Castilla', 'Molinopampa', 'Montevideo', 'Olleros', 'Quinjalca', 'San Francisco de Daguas', 'San Isidro de Maino', 'Soloco', 'Sonche'] },
      { name: 'Bagua', districts: ['Bagua', 'Aramango', 'Copallin', 'El Parco', 'Imaza', 'La Peca'] },
      { name: 'Bongará', districts: ['Jumbilla', 'Chisquilla', 'Churuja', 'Corosha', 'Cuispes', 'Florida', 'Jazán', 'Recta', 'San Carlos', 'Shipasbamba', 'Valera', 'Yambrasbamba'] },
      { name: 'Condorcanqui', districts: ['Nieva', 'El Cenepa', 'Río Santiago'] },
      { name: 'Luya', districts: ['Lámud', 'Camporredondo', 'Cocabamba', 'Colcamar', 'Conila', 'Inguilpata', 'Longuita', 'Lonya Chico', 'Luya', 'Luya Viejo', 'María', 'Ocalli', 'Ocumal', 'Pisuquía', 'Providencia', 'San Cristóbal', 'San Francisco del Yeso', 'San Jerónimo', 'San Juan de Lopecancha', 'Santa Catalina', 'Santo Tomás', 'Tingo', 'Trita'] },
      { name: 'Rodríguez de Mendoza', districts: ['Mendoza', 'Chirimoto', 'Cochamal', 'Huambo', 'Limabamba', 'Longar', 'Mariscal Benavides', 'Milpuc', 'Omia', 'Santa Rosa', 'Totora', 'Vista Alegre'] },
      { name: 'Utcubamba', districts: ['Bagua Grande', 'Cajaruro', 'Cumba', 'El Milagro', 'Jamalca', 'Lonya Grande', 'Yamon'] }
    ]
  },
  {
    department: 'Áncash',
    provinces: [
      { name: 'Huaraz', districts: ['Huaraz', 'Cochabamba', 'Colcabamba', 'Huanchay', 'Independencia', 'Jangas', 'La Libertad', 'Olleros', 'Pampas Grande', 'Pariacoto', 'Pira', 'Tarica'] },
      { name: 'Aija', districts: ['Aija', 'Coris', 'La Merced', 'Succha'] },
      { name: 'Antonio Raymondi', districts: ['Llamellín', 'Aczo', 'Chaccho', 'Chingas', 'Mirgas', 'San Juan de Rontoy'] },
      { name: 'Asunción', districts: ['Chacas', 'Acochaca'] },
      { name: 'Bolognesi', districts: ['Chiquián', 'Abelardo Pardo Lezameta', 'Antonio Raymondi', 'Aquia', 'Cajacay', 'Canis', 'Colquioc', 'Huallanca', 'Huasta', 'Huayllacayán', 'La Primavera', 'Mangas', 'Pacllón', 'San Miguel de Corpanqui', 'Ticllos'] },
      { name: 'Carhuaz', districts: ['Carhuaz', 'Acopampa', 'Amashca', 'Anta', 'Ataquero', 'Marcara', 'Pariahuanca', 'San Miguel de Aco', 'Shilla', 'Tinco', 'Yungar'] },
      { name: 'Carlos Fermín Fitzcarrald', districts: ['San Luis', 'San Nicolás', 'Yauya'] },
      { name: 'Casma', districts: ['Casma', 'Buena Vista Alta', 'Comandante Noel', 'Yaután'] },
      { name: 'Corongo', districts: ['Corongo', 'Aco', 'Bambas', 'Cusca', 'La Pampa', 'Yanac', 'Yupán'] },
      { name: 'Huari', districts: ['Huari', 'Anra', 'Cajay', 'Chavín de Huántar', 'Huacachi', 'Huacchis', 'Huachis', 'Huantar', 'Masin', 'Paucas', 'Ponto', 'Rahuapampa', 'Rapayán', 'San Marcos', 'San Pedro de Chana', 'Uco'] },
      { name: 'Huarmey', districts: ['Huarmey', 'Cochapeti', 'Culebras', 'Huayan', 'Malvas'] },
      { name: 'Huaylas', districts: ['Caraz', 'Huallanca', 'Huata', 'Huaylas', 'Mato', 'Pamparomás', 'Pueblo Libre', 'Santa Cruz', 'Santo Toribio', 'Yuracmarca'] },
      { name: 'Mariscal Luzuriaga', districts: ['Piscobamba', 'Casca', 'Eleazar Guzmán Barrón', 'Fidel Olivas Escudero', 'Llama', 'Llumpa', 'Lucma', 'Musga'] },
      { name: 'Ocros', districts: ['Ocros', 'Acas', 'Cajamarquilla', 'Carhuapampa', 'Cochas', 'Congas', 'Llipa', 'San Cristóbal de Rajan', 'San Pedro', 'Santiago de Chilcas'] },
      { name: 'Pallasca', districts: ['Cabana', 'Bolognesi', 'Conchucos', 'Huacaschuque', 'Huandoval', 'Lacabamba', 'Llapo', 'Pallasca', 'Pampas', 'Santa Rosa', 'Tauca'] },
      { name: 'Pomabamba', districts: ['Pomabamba', 'Huayllán', 'Parobamba', 'Quinuabamba'] },
      { name: 'Recuay', districts: ['Recuay', 'Catac', 'Cotaparaco', 'Huayllapampa', 'Llacllín', 'Marca', 'Pampas Chico', 'Pararín', 'Tapacocha', 'Ticapampa'] },
      { name: 'Santa', districts: ['Chimbote', 'Cáceres del Perú', 'Coishco', 'Macate', 'Moro', 'Nepeña', 'Samanco', 'Santa', 'Nuevo Chimbote'] },
      { name: 'Sihuas', districts: ['Sihuas', 'Acobamba', 'Alfonso Ugarte', 'Cashapampa', 'Chingalpo', 'Huayllabamba', 'Quiches', 'Ragash', 'San Juan', 'Sicsibamba'] },
      { name: 'Yungay', districts: ['Yungay', 'Cascapara', 'Mancos', 'Matacoto', 'Quillo', 'Ranrahirca', 'Shupluy', 'Yanama'] }
    ]
  },
  {
    department: 'Apurímac',
    provinces: [
      { name: 'Abancay', districts: ['Abancay', 'Chacoche', 'Circa', 'Curahuasi', 'Huanipaca', 'Lambrama', 'Pichirhua', 'San Pedro de Cachora', 'Tamburco'] },
      { name: 'Andahuaylas', districts: ['Andahuaylas', 'Andarapa', 'Chiara', 'Huancarama', 'Huancaray', 'Huayana', 'Kishuara', 'Pacobamba', 'Pacucha', 'Pampachiri', 'Pomacocha', 'San Antonio de Cachi', 'San Jerónimo', 'San Miguel de Chaccrampa', 'Santa María de Chicmo', 'Talavera', 'Tumay Huaraca', 'Turpo'] },
      { name: 'Antabamba', districts: ['Antabamba', 'El Oro', 'Huaquirca', 'Juan Espinoza Medrano', 'Oropesa', 'Pachaconas', 'Sabaino'] },
      { name: 'Aymaraes', districts: ['Chalhuanca', 'Capaya', 'Caraybamba', 'Chapimarca', 'Colcabamba', 'Cotaruse', 'Huayllo', 'Justo Apu Sahuaraura', 'Lucre', 'Pocohuanca', 'San Juan de Chacña', 'Sañayca', 'Soraya', 'Tapairihua', 'Tintay', 'Toraya', 'Yanaca'] },
      { name: 'Cotabambas', districts: ['Tambobamba', 'Cotabambas', 'Coyllurqui', 'Haquira', 'Mara', 'Challhuahuacho'] },
      { name: 'Chincheros', districts: ['Chincheros', 'Anco_Huallo', 'Cocharcas', 'Huaccana', 'Ocobamba', 'Ongoy', 'Uranmarca', 'Ranracancha'] },
      { name: 'Grau', districts: ['Chuquibambilla', 'Curpahuasi', 'Gamarra', 'Huayllati', 'Mamara', 'Micaela Bastidas', 'Pataypampa', 'Progreso', 'San Antonio', 'Santa Rosa', 'Turpay', 'Vilcabamba', 'Virundo', 'Curasco', 'Huaquirca'] }
    ]
  },
  {
    department: 'Arequipa',
    provinces: [
      { name: 'Arequipa', districts: ['Arequipa', 'Alto Selva Alegre', 'Cayma', 'Cerro Colorado', 'Characato', 'Chiguata', 'Jacobo Hunter', 'La Joya', 'Mariano Melgar', 'Miraflores', 'Mollebaya', 'Paucarpata', 'Pocsi', 'Polobaya', 'Quequeña', 'Sabandía', 'Sachaca', 'San Juan de Siguas', 'San Juan de Tarucani', 'Santa Isabel de Siguas', 'Santa Rita de Siguas', 'Socabaya', 'Tiabaya', 'Uchumayo', 'Vitor', 'Yanahuara', 'Yarabamba', 'Yura'] },
      { name: 'Camaná', districts: ['Camaná', 'José María Quimper', 'Mariano Nicolás Valcárcel', 'Mariscal Cáceres', 'Nicolás de Piérola', 'Ocoña', 'Quilca', 'Samuel Pastor'] },
      { name: 'Caravelí', districts: ['Caravelí', 'Acarí', 'Atico', 'Atiquipa', 'Bella Unión', 'Cahuacho', 'Chala', 'Chaparra', 'Huanuhuanu', 'Jaqui', 'Lomas', 'Quicacha', 'Yauca'] },
      { name: 'Castilla', districts: ['Aplao', 'Andagua', 'Ayo', 'Chachas', 'Chilcaymarca', 'Choco', 'Huancarqui', 'Machaguay', 'Orcopampa', 'Pampacolca', 'Tipán', 'Uñón', 'Uraca', 'Viraco'] },
      { name: 'Caylloma', districts: ['Chivay', 'Achoma', 'Cabanaconde', 'Callalli', 'Caylloma', 'Coporaque', 'Huambo', 'Huanca', 'Ichupampa', 'Lari', 'Lluta', 'Maca', 'Madrigal', 'San Antonio de Chuca', 'Sibayo', 'Tapay', 'Tisco', 'Tuti', 'Yanque'] },
      { name: 'Condesuyos', districts: ['Chuquibamba', 'Andaray', 'Cayarani', 'Chichas', 'Iray', 'Río Grande', 'Salamanca', 'Yanaquihua'] },
      { name: 'Islay', districts: ['Mollendo', 'Cocachacra', 'Dean Valdivia', 'Islay', 'Mejía', 'Punta de Bombón'] },
      { name: 'La Unión', districts: ['Cotahuasi', 'Alca', 'Charcana', 'Huaynacotas', 'Pampamarca', 'Puyca', 'Quechualla', 'Sayla', 'Tauría', 'Tomepampa', 'Toro'] }
    ]
  },
  {
    department: 'Ayacucho',
    provinces: [
      { name: 'Huamanga', districts: ['Ayacucho', 'Acocro', 'Acos Vinchos', 'Carmen Alto', 'Chiara', 'Ocros', 'Pacaycasa', 'Quinua', 'San José de Ticllas', 'San Juan Bautista', 'Santiago de Pischa', 'Socos', 'Tambillo', 'Vinchos', 'Jesús Nazareno'] },
      { name: 'Cangallo', districts: ['Cangallo', 'Chuschi', 'Los Morochucos', 'María Parado de Bellido', 'Paras', 'Totos'] },
      { name: 'Huanca Sancos', districts: ['Sancos', 'Carapo', 'Sacsamarca', 'Santiago de Lucanamarca'] },
      { name: 'Huanta', districts: ['Huanta', 'Ayahuanco', 'Huamanguilla', 'Iguain', 'Luricocha', 'Santillana', 'Sivia', 'Llochegua'] },
      { name: 'La Mar', districts: ['San Miguel', 'Anco', 'Ayna', 'Chilcas', 'Chungui', 'Luis Carranza', 'Santa Rosa', 'Tambo', 'Samugari'] },
      { name: 'Lucanas', districts: ['Puquio', 'Aucara', 'Cabana', 'Carmen Salcedo', 'Chaviña', 'Chipao', 'Huac-Huas', 'Laramate', 'Leoncio Prado', 'Llauta', 'Ocaña', 'Otoca', 'Saisa', 'San Cristóbal', 'San Juan', 'San Pedro', 'San Pedro de Palco', 'Sancos', 'Santa Ana de Huaycahuacho', 'Santa Lucía'] },
      { name: 'Parinacochas', districts: ['Coracora', 'Chumpi', 'Coronel Castañeda', 'Pacapausa', 'Pullo', 'Puyusca', 'San Francisco de Ravacayco', 'Upahuacho'] },
      { name: 'Páucar del Sara Sara', districts: ['Pausa', 'Colta', 'Corculla', 'Lampa', 'Marcabamba', 'Oyolo', 'Pararca', 'San Javier de Alpabamba', 'San José de Ushua', 'Sara Sara'] },
      { name: 'Sucre', districts: ['Querobamba', 'Belen', 'Chalcos', 'Chilcaymarca', 'Huacaña', 'Morcolla', 'Paico', 'San Pedro de Larcay', 'San Salvador de Quije', 'Santiago de Paucaray', 'Soras'] },
      { name: 'Víctor Fajardo', districts: ['Huancapi', 'Alcamenca', 'Apongo', 'Asquipata', 'Canaria', 'Cayara', 'Colca', 'Huamanquiquia', 'Huancaraylla', 'Hualla', 'Sarhua', 'Vilcanchos'] },
      { name: 'Vilcas Huamán', districts: ['Vilcas Huamán', 'Accomarca', 'Carhuanca', 'Concepción', 'Huambalpa', 'Independencia', 'Saurama', 'Vischongo'] }
    ]
  },
  {
    department: 'Cajamarca',
    provinces: [
      { name: 'Cajamarca', districts: ['Cajamarca', 'Asunción', 'Chetilla', 'Cospan', 'Encañada', 'Jesús', 'Llacanora', 'Los Baños del Inca', 'Magdalena', 'Matara', 'Namora', 'San Juan'] },
      { name: 'Cajabamba', districts: ['Cajabamba', 'Cachachi', 'Condebamba', 'Sitacocha'] },
      { name: 'Celendín', districts: ['Celendín', 'Chumuch', 'Cortegana', 'Huasmin', 'Jorge Chávez', 'José Gálvez', 'Miguel Iglesias', 'Oxamarca', 'Sorochuco', 'Sucre', 'Utco', 'La Libertad de Pallan'] },
      { name: 'Chota', districts: ['Chota', 'Anguía', 'Chadin', 'Chiguirip', 'Chimban', 'Choropampa', 'Cochabamba', 'Conchán', 'Huambos', 'Lajas', 'Llama', 'Miracosta', 'Paccha', 'Pión', 'Querocoto', 'San Juan de Licupis', 'Tacabamba', 'Tocmoche', 'Chalamarca'] },
      { name: 'Contumazá', districts: ['Contumazá', 'Chilete', 'Cupisnique', 'Guzmango', 'San Benito', 'Santa Cruz de Toledo', 'Tantarica', 'Yonán'] },
      { name: 'Cutervo', districts: ['Cutervo', 'Callayuc', 'Choros', 'Cujillo', 'La Ramada', 'Pimpingos', 'Querocotillo', 'San Andrés de Cutervo', 'San Juan de Cutervo', 'San Luis de Lucma', 'Santa Cruz', 'Santo Domingo de la Capilla', 'Santo Tomás', 'Socota', 'Toribio Casanova'] },
      { name: 'Hualgayoc', districts: ['Bambamarca', 'Chugur', 'Hualgayoc'] },
      { name: 'Jaén', districts: ['Jaén', 'Bellavista', 'Chontali', 'Colasay', 'Huabal', 'Las Pirias', 'Pomahuaca', 'Pucara', 'Sallique', 'San Felipe', 'San José del Alto', 'Santa Rosa'] },
      { name: 'San Ignacio', districts: ['San Ignacio', 'Chirinos', 'Huarango', 'La Coipa', 'Namballe', 'San José de Lourdes', 'Tabaconas'] },
      { name: 'San Marcos', districts: ['Pedro Gálvez', 'Chancay', 'Eduardo Villanueva', 'Gregorio Pita', 'Ichocan', 'José Manuel Quiroz', 'José Sabogal'] },
      { name: 'San Miguel', districts: ['San Miguel de Pallaques', 'Bolívar', 'Calquis', 'Catilluc', 'El Prado', 'La Florida', 'Llapa', 'Nanchoc', 'Niepos', 'San Gregorio', 'San Silvestre de Cochan', 'Tongod', 'Unión Agua Blanca'] },
      { name: 'San Pablo', districts: ['San Pablo', 'San Bernardino', 'San Luis', 'Tumbaden'] },
      { name: 'Santa Cruz', districts: ['Santa Cruz', 'Andabamba', 'Catache', 'Chancaybaños', 'La Esperanza', 'Ninabamba', 'Pulan', 'Saucepampa', 'Sexi', 'Uticyacu', 'Yauyucan'] }
    ]
  },
  {
    department: 'Callao',
    provinces: [
      { name: 'Callao', districts: ['Callao', 'Bellavista', 'Carmen de la Legua Reynoso', 'La Perla', 'La Punta', 'Ventanilla', 'Mi Perú'] }
    ]
  },
  {
    department: 'Cusco',
    provinces: [
      { name: 'Cusco', districts: ['Cusco', 'Ccorca', 'Poroy', 'San Jerónimo', 'San Sebastian', 'Santiago', 'Saylla', 'Wanchaq'] },
      { name: 'Acomayo', districts: ['Acomayo', 'Acopia', 'Acos', 'Mosoc Llacta', 'Pomacanchi', 'Rondocan', 'Sangarará'] },
      { name: 'Anta', districts: ['Anta', 'Ancahuasi', 'Cachimayo', 'Chinchaypujio', 'Huarocondo', 'Limatambo', 'Mollepata', 'Pucyura', 'Zurite'] },
      { name: 'Calca', districts: ['Calca', 'Coya', 'Lamay', 'Lares', 'Pisac', 'San Salvador', 'Taray', 'Yanatile'] },
      { name: 'Canas', districts: ['Yanaoca', 'Checca', 'Kunturkanki', 'Langui', 'Layo', 'Pampamarca', 'Quehue', 'Tupac Amaru'] },
      { name: 'Canchis', districts: ['Sicuani', 'Checacupe', 'Combapata', 'Marangani', 'Pitumarca', 'San Pablo', 'San Pedro', 'Tinta'] },
      { name: 'Chumbivilcas', districts: ['Santo Tomás', 'Capacmarca', 'Chamaca', 'Colquemarca', 'Livitaca', 'Llusco', 'Quiñota', 'Velille'] },
      { name: 'Espinar', districts: ['Espinar', 'Condoroma', 'Coporaque', 'Ocoruro', 'Pallpata', 'Pichigua', 'Suyckutambo', 'Alto Pichigua'] },
      { name: 'La Convención', districts: ['Quillabamba', 'Echarate', 'Huayopata', 'Maranura', 'Ocobamba', 'Pichari', 'Quellouno', 'Kimbiri', 'Santa Ana', 'Santa Teresa', 'Vilcabamba', 'Inkawasi', 'Villa Virgen', 'Villa Kintiarina', 'Megantoni'] },
      { name: 'Paruro', districts: ['Paruro', 'Accha', 'Ccapi', 'Colcha', 'Huanoquite', 'Omacha', 'Paccaritambo', 'Pillpinto', 'Yaurisque'] },
      { name: 'Paucartambo', districts: ['Paucartambo', 'Caicay', 'Challabamba', 'Colquepata', 'Huancarani', 'Kosñipata'] },
      { name: 'Quispicanchi', districts: ['Urcos', 'Andahuaylillas', 'Camanti', 'Ccarhuayo', 'Ccatca', 'Cusipata', 'Huaro', 'Lucre', 'Marcapata', 'Ocongate', 'Oropesa', 'Quiquijana'] },
      { name: 'Urubamba', districts: ['Urubamba', 'Chinchero', 'Huayllabamba', 'Machupicchu', 'Maras', 'Ollantaytambo', 'Yucay'] }
    ]
  },
  {
    department: 'Huancavelica',
    provinces: [
      { name: 'Huancavelica', districts: ['Huancavelica', 'Acobambilla', 'Acoria', 'Conayca', 'Cuenca', 'Huachocolpa', 'Huayllahuara', 'Izcuchaca', 'Laria', 'Manta', 'Mariscal Cáceres', 'Moya', 'Nuevo Occoro', 'Palca', 'Pilchaca', 'Vilca', 'Yauli', 'Ascensión', 'Nuevo Occoro'] },
      { name: 'Acobamba', districts: ['Acobamba', 'Andabamba', 'Anta', 'Caja', 'Marcas', 'Paucara', 'Pomacocha', 'Rosario'] },
      { name: 'Angaraes', districts: ['Lircay', 'Anchonga', 'Callanmarca', 'Ccochaccasa', 'Chincho', 'Congalla', 'Huanca-Huanca', 'Huayllay Grande', 'Julcamarca', 'San Antonio de Antaparco', 'Santo Tomás de Pata', 'Secclla'] },
      { name: 'Castrovirreyna', districts: ['Castrovirreyna', 'Arma', 'Aurahua', 'Capillas', 'Chupamarca', 'Cocas', 'Huachos', 'Huamatambo', 'Mollepampa', 'San Juan', 'Santa Ana', 'Tantara', 'Ticrapo'] },
      { name: 'Churcampa', districts: ['Churcampa', 'Anco', 'Chinchihuasi', 'El Carmen', 'La Merced', 'Locroja', 'Paucarbamba', 'San Miguel de Mayocc', 'San Pedro de Coris', 'Pachamarca', 'Cosme'] },
      { name: 'Huaytará', districts: ['Huaytará', 'Ayavi', 'Córdova', 'Huayacundo Arma', 'Laramarca', 'Ocoyo', 'Pilpichaca', 'Querco', 'Quito-Arma', 'San Antonio de Cusicancha', 'San Francisco de Sangayaico', 'San Isidro', 'Santiago de Chocorvos', 'Santiago de Quirahuara', 'Santo Domingo de Capillas', 'Tambo'] },
      { name: 'Tayacaja', districts: ['Pampas', 'Acostambo', 'Acraquia', 'Ahuaycha', 'Colcabamba', 'Daniel Hernández', 'Huachocolpa', 'Huaribamba', 'Ñahuimpuquio', 'Pazos', 'Quishuar', 'Salcabamba', 'Salcahuasi', 'San Marcos de Rocchac', 'Surcubamba', 'Tintay Puncu', 'Quichuas', 'Andaymarca', 'Roble', 'Pichos', 'Santiago de Tucuma'] }
    ]
  },
  {
    department: 'Huánuco',
    provinces: [
      { name: 'Huánuco', districts: ['Huánuco', 'Amarilis', 'Chinchao', 'Churubamba', 'Margos', 'Quisqui', 'San Francisco de Cayran', 'San Pedro de Chaulán', 'Santa María del Valle', 'Yarumayo', 'Pillco Marca', 'Yacus'] },
      { name: 'Ambo', districts: ['Ambo', 'Cayna', 'Colpas', 'Conchamarca', 'Huacar', 'San Francisco', 'San Rafael', 'Tomay Kichwa'] },
      { name: 'Dos de Mayo', districts: ['La Unión', 'Chuquis', 'Marías', 'Pachas', 'Quivilla', 'Ripan', 'Shunqui', 'Sillapata', 'Yanas'] },
      { name: 'Huacaybamba', districts: ['Huacaybamba', 'Canchabamba', 'Cochabamba', 'Pinra'] },
      { name: 'Huamalíes', districts: ['Llata', 'Arancay', 'Chavín de Pariarca', 'Jacas Grande', 'Jircan', 'Miraflores', 'Monzón', 'Punchao', 'Puños', 'Singa', 'Tantamayo'] },
      { name: 'Leoncio Prado', districts: ['Rupa-Rupa', 'Daniel Alomía Robles', 'Hermilio Valdizán', 'José Crespo y Castillo', 'Luyando', 'Mariano Dámaso Beraún', 'Pucayacu', 'Castillo Grande', 'Pueblo Nuevo', 'Santo Domingo de Anda'] },
      { name: 'Marañón', districts: ['Huacrachuco', 'Cholon', 'San Buenaventura'] },
      { name: 'Pachitea', districts: ['Panao', 'Chaglla', 'Molino', 'Umari'] },
      { name: 'Puerto Inca', districts: ['Puerto Inca', 'Codo del Pozuzo', 'Honoria', 'Tournavista', 'Yuyapichis'] },
      { name: 'Lauricocha', districts: ['Jesús', 'Baños', 'Jivia', 'Queropalca', 'Rondos', 'San Francisco de Asís', 'San Miguel de Cauri'] },
      { name: 'Yarowilca', districts: ['Chavinillo', 'Cahuac', 'Chacabamba', 'Chupan', 'Jacas Chico', 'Obas', 'Pampamarca', 'Choras'] }
    ]
  },
  {
    department: 'Ica',
    provinces: [
      { name: 'Ica', districts: ['Ica', 'La Tinguiña', 'Los Aquijes', 'Ocucaje', 'Pachacutec', 'Parcona', 'Pueblo Nuevo', 'Salas', 'San José de Los Molinos', 'San Juan Bautista', 'Santiago', 'Subtanjalla', 'Tate', 'Yauca del Rosario'] },
      { name: 'Chincha', districts: ['Chincha Alta', 'Alto Laran', 'Chavín', 'Chincha Baja', 'El Carmen', 'Grocio Prado', 'Pueblo Nuevo', 'San Juan de Yanac', 'San Pedro de Huacarpana', 'Sunampe', 'Tambo de Mora'] },
      { name: 'Nazca', districts: ['Nazca', 'Changuillo', 'El Ingenio', 'Marcona', 'Vista Alegre'] },
      { name: 'Palpa', districts: ['Palpa', 'Llipata', 'Río Grande', 'Santa Cruz', 'Tibillo'] },
      { name: 'Pisco', districts: ['Pisco', 'Huancano', 'Humay', 'Independencia', 'Paracas', 'San Andrés', 'San Clemente', 'Tupac Amaru Inca'] }
    ]
  },
  {
    department: 'Junín',
    provinces: [
      { name: 'Huancayo', districts: ['Huancayo', 'Carhuacallanga', 'Chacapampa', 'Chicche', 'Chilca', 'Chongos Alto', 'Chupuro', 'Colca', 'Cullhuas', 'El Tambo', 'Huacrapuquio', 'Hualhuas', 'Huancan', 'Huasicancha', 'Huayucachi', 'Ingenio', 'Pariahuanca', 'Pilcomayo', 'Pucara', 'Quichuay', 'Quilcas', 'San Agustín', 'San Jerónimo de Tunan', 'Saño', 'Sapallanga', 'Sicaya', 'Santo Domingo de Acobamba', 'Viques'] },
      { name: 'Concepción', districts: ['Concepción', 'Aco', 'Andamarca', 'Chambara', 'Cochas', 'Comas', 'Heroínas Toledo', 'Manzanares', 'Mariscal Castilla', 'Matahuasi', 'Mito', 'Nueve de Julio', 'Orcotuna', 'San José de Quero', 'Santa Rosa de Ocopa'] },
      { name: 'Chanchamayo', districts: ['Chanchamayo', 'Perené', 'Pichanaqui', 'San Luis de Shuaro', 'San Ramón', 'Vitoc'] },
      { name: 'Jauja', districts: ['Jauja', 'Acolla', 'Apata', 'Ataura', 'Canchayllo', 'Curicaca', 'El Mantaro', 'Huamali', 'Huaripampa', 'Huertas', 'Janjaillo', 'Julcán', 'Leonor Ordóñez', 'Llocllapampa', 'Marco', 'Masma', 'Masma Chicche', 'Molinos', 'Monobamba', 'Muqui', 'Muquiyauyo', 'Paca', 'Paccha', 'Pancan', 'Parco', 'Pomacancha', 'Ricran', 'San Lorenzo', 'San Pedro de Chunan', 'Sausa', 'Sincos', 'Tunan Marca', 'Yauli', 'Yauyos'] },
      { name: 'Junín', districts: ['Junín', 'Carhuamayo', 'Ondores', 'Ulcumayo'] },
      { name: 'Satipo', districts: ['Satipo', 'Coviriali', 'Llaylla', 'Mazamari', 'Pampa Hermosa', 'Pangoa', 'Río Negro', 'Río Tambo', 'Vizcatán del Ene'] },
      { name: 'Tarma', districts: ['Tarma', 'Acobamba', 'Huaricolca', 'Huasahuasi', 'La Unión', 'Palca', 'Palcamayo', 'San Pedro de Cajas', 'Tapo', 'Tarmatambo'] },
      { name: 'Yauli', districts: ['La Oroya', 'Chacapalpa', 'Huay-Huay', 'Marcapomacocha', 'Morococha', 'Paccha', 'Santa Bárbara de Carhuacayan', 'Santa Rosa de Sacco', 'Suitucancha', 'Yauli'] },
      { name: 'Chupaca', districts: ['Chupaca', 'Ahuac', 'Chongos Bajo', 'Huachac', 'Huamancaca Chico', 'San Juan de Iscos', 'San Juan de Jarpa', 'Tres de Diciembre', 'Yanacancha'] }
    ]
  },
  {
    department: 'La Libertad',
    provinces: [
      { name: 'Trujillo', districts: ['Trujillo', 'El Porvenir', 'Florencia de Mora', 'Huanchaco', 'La Esperanza', 'Laredo', 'Moche', 'Poroto', 'Salaverry', 'Simbal', 'Victor Larco Herrera'] },
      { name: 'Ascope', districts: ['Ascope', 'Chicama', 'Chocope', 'Magdalena de Cao', 'Paiján', 'Rázuri', 'Santiago de Cao'] },
      { name: 'Bolívar', districts: ['Bolívar', 'Bambamarca', 'Condormarca', 'Longotea', 'Uchumarca', 'Ucuncha'] },
      { name: 'Chepén', districts: ['Chepén', 'Pacanga', 'Pueblo Nuevo'] },
      { name: 'Gran Chimú', districts: ['Cascas', 'Lucma', 'Marmot', 'Sayapullo'] },
      { name: 'Julcán', districts: ['Julcán', 'Calamarca', 'Carabamba', 'Huaso'] },
      { name: 'Otuzco', districts: ['Otuzco', 'Agallpampa', 'Charat', 'Huaranchal', 'La Cuesta', 'Mache', 'Paranday', 'Salpo', 'Sinsicap', 'Usquil'] },
      { name: 'Pacasmayo', districts: ['San Pedro de Lloc', 'Guadalupe', 'Jequetepeque', 'Pacasmayo', 'San José'] },
      { name: 'Pataz', districts: ['Tayabamba', 'Buldibuyo', 'Chillia', 'Huancaspata', 'Huaylillas', 'Huayo', 'Ongon', 'Parcoy', 'Pataz', 'Pías', 'Santiago de Challas', 'Taurija', 'Urpay'] },
      { name: 'Sánchez Carrión', districts: ['Huamachuco', 'Chugay', 'Cochorco', 'Curgos', 'Marcabal', 'Sanagoran', 'Sarin', 'Sartimbamba'] },
      { name: 'Santiago de Chuco', districts: ['Santiago de Chuco', 'Angasmarca', 'Cachicadán', 'Mollebamba', 'Mollepata', 'Quiruvilca', 'Santa Cruz de Chuca', 'Sitabamba'] },
      { name: 'Virú', districts: ['Virú', 'Chao', 'Guadalupito'] }
    ]
  },
  {
    department: 'Lambayeque',
    provinces: [
      { name: 'Chiclayo', districts: ['Chiclayo', 'Chongoyape', 'Eten', 'Eten Puerto', 'José Leonardo Ortiz', 'La Victoria', 'Lagunas', 'Monsefú', 'Nueva Arica', 'Oyotún', 'Picsi', 'Pimentel', 'Reque', 'Santa Rosa', 'Saña', 'Cayaltí', 'Patapo', 'Pomalca', 'Pucalá', 'Tumán'] },
      { name: 'Ferreñafe', districts: ['Ferreñafe', 'Cañaris', 'Incahuasi', 'Manuel Antonio Mesones Muro', 'Pitipo', 'Pueblo Nuevo'] },
      { name: 'Lambayeque', districts: ['Lambayeque', 'Chochope', 'Illimo', 'Jayanca', 'Mochumí', 'Mórrope', 'Motupe', 'Olmos', 'Pacora', 'Salas', 'San José', 'Túcume'] }
    ]
  },
  {
    department: 'Lima',
    provinces: [
      { name: 'Lima', districts: ['Lima', 'Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lince', 'Los Olivos', 'Lurigancho', 'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacamac', 'Pucusana', 'Pueblo Libre', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'] },
      { name: 'Barranca', districts: ['Barranca', 'Paramonga', 'Pativilca', 'Supe', 'Supe Puerto'] },
      { name: 'Cajatambo', districts: ['Cajatambo', 'Copa', 'Gorgor', 'Huancapon', 'Manas'] },
      { name: 'Canta', districts: ['Canta', 'Arahuay', 'Huamantanga', 'Huaros', 'Lachaqui', 'San Buenaventura'] },
      { name: 'Cañete', districts: ['San Vicente de Cañete', 'Asia', 'Calango', 'Cerro Azul', 'Chilca', 'Coayllo', 'Imperial', 'Lunahuaná', 'Mala', 'Nuevo Imperial', 'Pacarán', 'Quilmana', 'San Antonio', 'San Luis', 'Santa Cruz de Flores', 'Zúñiga'] },
      { name: 'Huaral', districts: ['Huaral', 'Atavillos Alto', 'Atavillos Bajo', 'Aucallama', 'Chancay', 'Ihuari', 'Lampian', 'Pacaraos', 'San Miguel de Acos', 'Santa Cruz de Andamarca', 'Sumbilca', 'Veintisiete de Noviembre'] },
      { name: 'Huarochirí', districts: ['Matucana', 'Antioquia', 'Callahuanca', 'Carampoma', 'Chicla', 'Cuenca', 'Huachupampa', 'Huanza', 'Huarochirí', 'Lahuaytambo', 'Langa', 'Laraos', 'Mariatana', 'Ricardo Palma', 'San Andrés de Tupicocha', 'San Antonio', 'San Bartolomé', 'San Damian', 'San Juan de Iris', 'San Juan de Tantaranche', 'San Lorenzo de Quinti', 'San Mateo', 'San Mateo de Otao', 'San Pedro de Casta', 'San Pedro de Huancayre', 'Sangallaya', 'Santa Cruz de Cocachacra', 'Santa Eulalia', 'Santiago de Anchucaya', 'Santiago de Tuna', 'Santo Domingo de los Olleros', 'Surco'] },
      { name: 'Huaura', districts: ['Huacho', 'Ámbar', 'Caleta de Carquín', 'Checras', 'Hualmay', 'Huaura', 'Leoncio Prado', 'Paccho', 'Santa Leonor', 'Santa María', 'Sayan', 'Vegueta'] },
      { name: 'Oyón', districts: ['Oyón', 'Andajes', 'Caujul', 'Cochamarca', 'Navan', 'Pachangara'] },
      { name: 'Yauyos', districts: ['Yauyos', 'Alis', 'Allauca', 'Ayaviri', 'Azángaro', 'Cacra', 'Carania', 'Catahuasi', 'Chocos', 'Cochas', 'Colonia', 'Hongos', 'Huampara', 'Huancaya', 'Huangascar', 'Huantan', 'Huañec', 'Laraos', 'Lincha', 'Madean', 'Miraflores', 'Omas', 'Putinza', 'Quinches', 'Quinocay', 'San Joaquín', 'San Pedro de Pilas', 'Tanta', 'Tauripampa', 'Tomas', 'Tupe', 'Viñac', 'Vitis'] }
    ]
  },
  {
    department: 'Loreto',
    provinces: [
      { name: 'Maynas', districts: ['Iquitos', 'Alto Nanay', 'Fernando Lores', 'Indiana', 'Las Amazonas', 'Mazan', 'Napo', 'Punchana', 'Torres Causana', 'Belén', 'San Juan Bautista', 'Teniente Manuel Clavero'] },
      { name: 'Alto Amazonas', districts: ['Yurimaguas', 'Balsapuerto', 'Barranca', 'Cahuapanas', 'Jeberos', 'Lagunas', 'Manseriche', 'Morona', 'Pastaza', 'Santa Cruz', 'Teniente César López Rojas'] },
      { name: 'Datem del Marañón', districts: ['Barranca', 'Cahuapanas', 'Manseriche', 'Morona', 'Pastaza', 'Andoas'] },
      { name: 'Loreto', districts: ['Nauta', 'Parinari', 'Tigre', 'Trompeteros', 'Urarinas'] },
      { name: 'Mariscal Ramón Castilla', districts: ['Ramón Castilla', 'Pebas', 'Yavari', 'San Pablo'] },
      { name: 'Putumayo', districts: ['Putumayo', 'Rosa Panduro', 'Teniente Manuel Clavero', 'Yaguas'] },
      { name: 'Requena', districts: ['Requena', 'Alto Tapiche', 'Capelo', 'Emilio San Martín', 'Maquia', 'Puinahua', 'Saquena', 'Soplin', 'Tapiche', 'Jenaro Herrera', 'Yaquerana'] },
      { name: 'Ucayali', districts: ['Contamana', 'Inahuaya', 'Padre Márquez', 'Pampa Hermosa', 'Sarayacu', 'Vargas Guerra'] }
    ]
  },
  {
    department: 'Madre de Dios',
    provinces: [
      { name: 'Tambopata', districts: ['Tambopata', 'Inambari', 'Las Piedras', 'Laberinto'] },
      { name: 'Manu', districts: ['Manu', 'Fitzcarrald', 'Madre de Dios', 'Huepetuhe'] },
      { name: 'Tahuamanu', districts: ['Iñapari', 'Iberia', 'Tahuamanu'] }
    ]
  },
  {
    department: 'Moquegua',
    provinces: [
      { name: 'Mariscal Nieto', districts: ['Moquegua', 'Carumas', 'Cuchumbaya', 'Samegua', 'San Cristóbal', 'Torata'] },
      { name: 'General Sánchez Cerro', districts: ['Omate', 'Chojata', 'Coalaque', 'Ichuña', 'La Capilla', 'Lloque', 'Matalaque', 'Puquina', 'Quinistaquillas', 'Ubinas', 'Yunga'] },
      { name: 'Ilo', districts: ['Ilo', 'El Algarrobal', 'Pacocha'] }
    ]
  },
  {
    department: 'Pasco',
    provinces: [
      { name: 'Pasco', districts: ['Cerro de Pasco', 'Chaupimarca', 'Huachon', 'Huariaca', 'Huayllay', 'Ninacaca', 'Pallanchacra', 'Paucartambo', 'San Francisco de Asís de Yarusyacan', 'Simon Bolívar', 'Ticlacayan', 'Tinyahuarco', 'Vicco', 'Yanacancha'] },
      { name: 'Daniel Alcides Carrión', districts: ['Yanahuanca', 'Chacayan', 'Goyllarisquizga', 'Paucar', 'San Pedro de Pillao', 'Santa Ana de Tusi', 'Tapuc', 'Vilcabamba'] },
      { name: 'Oxapampa', districts: ['Oxapampa', 'Chontabamba', 'Huancabamba', 'Palcazu', 'Pozuzo', 'Puerto Bermúdez', 'Villa Rica', 'Constitución'] }
    ]
  },
  {
    department: 'Piura',
    provinces: [
      { name: 'Piura', districts: ['Piura', 'Castilla', 'Catacaos', 'Cura Mori', 'El Tallan', 'La Arena', 'La Unión', 'Las Lomas', 'Tambo Grande', 'Veintiséis de Octubre'] },
      { name: 'Ayabaca', districts: ['Ayabaca', 'Frias', 'Jilili', 'Lagunas', 'Montero', 'Pacaipampa', 'Paimas', 'Sapillica', 'Sicchez', 'Suyo'] },
      { name: 'Huancabamba', districts: ['Huancabamba', 'Canchaque', 'El Carmen de la Frontera', 'Huarmaca', 'Lalaquiz', 'San Miguel de El Faique', 'Sondor', 'Sondorillo'] },
      { name: 'Morropón', districts: ['Chulucanas', 'Buenos Aires', 'Chalaco', 'La Matanza', 'Morropón', 'Salitral', 'San Juan de Bigote', 'Santa Catalina de Mossa', 'Santo Domingo', 'Yamango'] },
      { name: 'Paita', districts: ['Paita', 'Amotape', 'Arenal', 'Colan', 'La Huaca', 'Tamarindo', 'Vichayal'] },
      { name: 'Sullana', districts: ['Sullana', 'Bellavista', 'Ignacio Escudero', 'Lancones', 'Marcavelica', 'Miguel Checa', 'Querecotillo', 'Salitral'] },
      { name: 'Sechura', districts: ['Sechura', 'Bellavista de la Unión', 'Bernal', 'Cristo Nos Valga', 'Vice', 'Rinconada Llicuar'] },
      { name: 'Talara', districts: ['Talara', 'El Alto', 'La Brea', 'Lobitos', 'Los Órganos', 'Máncora', 'Marcavelica'] }
    ]
  },
  {
    department: 'Puno',
    provinces: [
      { name: 'Puno', districts: ['Puno', 'Acora', 'Amantani', 'Atuncolla', 'Capachica', 'Chucuito', 'Coata', 'Huata', 'Mañazo', 'Paucarcolla', 'Pichacani', 'Plateria', 'San Antonio', 'Tiquillaca', 'Vilque'] },
      { name: 'Azángaro', districts: ['Azángaro', 'Achaya', 'Arapa', 'Asillo', 'Caminaca', 'Chupa', 'José Domingo Choquehuanca', 'Muñani', 'Potoni', 'Saman', 'San Anton', 'San José', 'San Juan de Salinas', 'Santiago de Pupuja', 'Tirrapata'] },
      { name: 'Carabaya', districts: ['Macusani', 'Ajoyani', 'Ayapata', 'Coasa', 'Corani', 'Crucero', 'Ituata', 'Ollachea', 'San Gaban', 'Usicayos'] },
      { name: 'Chucuito', districts: ['Juli', 'Desaguadero', 'Huacullani', 'Kelluyo', 'Pisacoma', 'Pomata', 'Zepita'] },
      { name: 'El Collao', districts: ['Ilave', 'Capazo', 'Pilcuyo', 'Santa Rosa', 'Conduriri'] },
      { name: 'Huancané', districts: ['Huancané', 'Cojata', 'Huatasani', 'Inchupalla', 'Pusi', 'Rosaspata', 'Taraco', 'Vilque Chico'] },
      { name: 'Lampa', districts: ['Lampa', 'Cabanilla', 'Calapuja', 'Nicasio', 'Ocuviri', 'Palca', 'Paratia', 'Pucara', 'Santa Lucia', 'Vilavila'] },
      { name: 'Melgar', districts: ['Ayaviri', 'Antauta', 'Cupi', 'Llalli', 'Macari', 'Nuñoa', 'Orurillo', 'Santa Rosa', 'Umachiri'] },
      { name: 'Moho', districts: ['Moho', 'Conima', 'Huayrapata', 'Tilali'] },
      { name: 'San Antonio de Putina', districts: ['Putina', 'Ananea', 'Pedro Vilca Apaza', 'Quilcapuncu', 'Sina'] },
      { name: 'San Román', districts: ['Juliaca', 'Cabana', 'Cabanillas', 'Caracoto', 'San Miguel'] },
      { name: 'Sandia', districts: ['Sandia', 'Cuyocuyo', 'Limbani', 'Patambuco', 'Phara', 'Quiaca', 'San Juan del Oro', 'Yanahuaya'] },
      { name: 'Yunguyo', districts: ['Yunguyo', 'Anapia', 'Copani', 'Cuturapi', 'Ollaraya', 'Tinicachi', 'Unicachi'] }
    ]
  },
  {
    department: 'San Martín',
    provinces: [
      { name: 'Moyobamba', districts: ['Moyobamba', 'Calzada', 'Habana', 'Jepelacio', 'Soritor', 'Yantalo', 'Yorongos', 'Yuracyacu'] },
      { name: 'Bellavista', districts: ['Bellavista', 'Alto Biavo', 'Bajo Biavo', 'Huallaga', 'San Pablo', 'San Rafael'] },
      { name: 'El Dorado', districts: ['San José de Sisa', 'Agua Blanca', 'San Martín', 'Santa Rosa', 'Shatoja'] },
      { name: 'Huallaga', districts: ['Saposoa', 'Alto Saposoa', 'El Eslabón', 'Piscoyacu', 'Sacanche', 'Tingo de Saposoa'] },
      { name: 'Lamas', districts: ['Lamas', 'Alonso de Alvarado', 'Barranquita', 'Caynarachi', 'Cuñumbuqui', 'Pinto Recodo', 'Rumisapa', 'San Roque de Cumbaza', 'Shanao', 'Tabalosos', 'Zapatero'] },
      { name: 'Mariscal Cáceres', districts: ['Juanjuí', 'Campanilla', 'Huicungo', 'Pachiza', 'Pajarillo'] },
      { name: 'Picota', districts: ['Picota', 'Buenos Aires', 'Caspisapa', 'Pilluana', 'Pucacaca', 'San Cristóbal', 'San Hilarión', 'Shamboyacu', 'Tingo de Ponasa', 'Tres Unidos'] },
      { name: 'Rioja', districts: ['Rioja', 'Awajun', 'Elías Soplin Vargas', 'Nueva Cajamarca', 'Pardo Miguel', 'Posic', 'San Fernando', 'Yorongos', 'Yuracyacu'] },
      { name: 'San Martín', districts: ['Tarapoto', 'Alberto Leveaú', 'Cacatachi', 'Chazuta', 'Chipurana', 'El Porvenir', 'Huimbayoc', 'Juan Guerra', 'La Banda de Shilcayo', 'Morales', 'Papaplaya', 'San Antonio', 'Sauce', 'Shapaja'] },
      { name: 'Tocache', districts: ['Tocache', 'Nuevo Progreso', 'Polvora', 'Shunte', 'Uchiza'] }
    ]
  },
  {
    department: 'Tacna',
    provinces: [
      { name: 'Tacna', districts: ['Tacna', 'Alto de la Alianza', 'Calana', 'Ciudad Nueva', 'Inclan', 'Pachia', 'Palca', 'Pocollay', 'Sama', 'Coronel Gregorio Albarracín Lanchipa'] },
      { name: 'Candarave', districts: ['Candarave', 'Cairani', 'Camilaca', 'Curibaya', 'Huanuara', 'Quilahuani'] },
      { name: 'Jorge Basadre', districts: ['Locumba', 'Ilabaya', 'Ite'] },
      { name: 'Tarata', districts: ['Tarata', 'Chucatamani', 'Estique', 'Estique-Pampa', 'Sitajara', 'Susapaya', 'Ticaco', 'Ticaco'] }
    ]
  },
  {
    department: 'Tumbes',
    provinces: [
      { name: 'Tumbes', districts: ['Tumbes', 'Corrales', 'La Cruz', 'Pampas de Hospital', 'San Jacinto', 'San Juan de la Virgen'] },
      { name: 'Contralmirante Villar', districts: ['Zorritos', 'Casitas', 'Canoas de Punta Sal'] },
      { name: 'Zarumilla', districts: ['Zarumilla', 'Aguas Verdes', 'Matapalo', 'Papayal'] }
    ]
  },
  {
    department: 'Ucayali',
    provinces: [
      { name: 'Coronel Portillo', districts: ['Callería', 'Campoverde', 'Iparia', 'Masisea', 'Yarinacocha', 'Nueva Requena'] },
      { name: 'Atalaya', districts: ['Raymondi', 'Sepahua', 'Tahuanía', 'Yurúa'] },
      { name: 'Padre Abad', districts: ['Padre Abad', 'Irazola', 'Curimana', 'Neshuya', 'Alexander Von Humboldt'] },
      { name: 'Purús', districts: ['Purús'] }
    ]
  }
];

async function main() {
  console.log('🌍 Iniciando carga de datos de Perú...');

  try {
    // Limpiar datos existentes (opcional - comentar si quieres mantener datos existentes)
    console.log('🗑️ Limpiando datos existentes...');
    await prisma.district.deleteMany();
    await prisma.province.deleteMany();
    await prisma.department.deleteMany();

    let totalDepartments = 0;
    let totalProvinces = 0;
    let totalDistricts = 0;

    // Insertar departamentos, provincias y distritos
    for (const deptData of peruData) {
      console.log(`\n📦 Procesando departamento: ${deptData.department}`);
      
      // Crear departamento
      const department = await prisma.department.create({
        data: {
          name: deptData.department,
        },
      });
      totalDepartments++;

      // Crear provincias del departamento
      for (const provData of deptData.provinces) {
        console.log(`  📍 Procesando provincia: ${provData.name}`);
        
        const province = await prisma.province.create({
          data: {
            name: provData.name,
            departmentId: department.id,
          },
        });
        totalProvinces++;

        // Eliminar duplicados dentro de la misma provincia
        const uniqueDistricts = [...new Set(provData.districts)];
        const duplicatesInProvince = provData.districts.length - uniqueDistricts.length;
        
        // Crear distritos de la provincia usando createMany para mejor rendimiento
        const districtsToCreate = uniqueDistricts.map(districtName => ({
          name: districtName,
          provinceId: province.id,
        }));

        const result = await prisma.district.createMany({
          data: districtsToCreate,
          skipDuplicates: true, // Saltar distritos con nombres duplicados entre provincias
        });
        
        totalDistricts += result.count;
        
        let message = `    ✅ ${result.count} distritos creados`;
        if (duplicatesInProvince > 0) {
          message += `, ${duplicatesInProvince} duplicado(s) eliminado(s) dentro de la provincia`;
        }
        if (result.count < uniqueDistricts.length) {
          const skipped = uniqueDistricts.length - result.count;
          message += `, ${skipped} duplicado(s) saltado(s) (entre provincias)`;
        }
        console.log(message);
      }
    }

    console.log('\n✅ Carga completada exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   - Departamentos: ${totalDepartments}`);
    console.log(`   - Provincias: ${totalProvinces}`);
    console.log(`   - Distritos: ${totalDistricts}`);

  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

