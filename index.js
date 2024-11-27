// LAS DEPENDENCIAS:
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const app = express();
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: 'uploads/' });
const PDFDocument = require('pdfkit');
const fs = require('fs');
const ExcelJS = require('exceljs');
//const bcrypt = require('bcryptjs');
//const jwt = require('jsonwebtoken');

// CARPETA PARA GUARDAR ARCHIVOS: uploads.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
//app.use(bodyParser.json());
app.use(express.json());

// PUERTO DEL SERVIDOR, CON EL ARCHIVO .ENV
const PORT = process.env.PORT || 4004;
app.listen(PORT, () => {
  console.log(`El servidor está en el puerto ${PORT}`);
});

// CONECCIÓN A LA BASE DE DATOS.
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

//REGISTRAR UN USUARIO: POST.
app.post('/register', (req, res) => {
  //Necesito obtener variables enviadas desde el formulario:
  const sentEmail = req.body.Email;
  const sentName = req.body.Name;
  const sentPassword = req.body.Password;

  //Crear una declaración SQL para insertar el usuario en la tabla de la base de datos:
  const SQL = 'INSERT INTO usuario (email, name, password) VALUES (?, ?, ?)';

  //Vay a introducir estos valores a través de una variable:
  const Values = [sentEmail, sentName, sentPassword];

  //Consulta para ejecutar la instrucción SQL indicada anteriormente:
  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send(err);
    } else {
      console.log('Usuario ingresado con éxito!');
      res.send({ message: 'Usuario agregado!' });
    }
  });
});

//INGRESO DEL USUARIO CON CREDENCIALES: POST.
app.post('/login', (req, res) => {
  //Necesito obtener variables enviadas desde el formulario:
  const sentLoginName = req.body.LoginName;
  const sentLoginPassword = req.body.LoginPassword;

  //Crear una declaración SQL para insertar el usuario en la tabla de la base de datos:
  const SQL = 'SELECT * FROM usuario WHERE name = ? && password = ?';

  //Vay a introducir estos valores a través de una variable:
  const Values = [sentLoginName, sentLoginPassword];

  //Consulta para ejecutar la instrucción SQL indicada anteriormente:
  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err });
    }
    if (results.length > 0) {
      res.send(results);
    } else {
      res.send({ message: `Credenciales incorrectas!` });
    }
  });
});

// POST: Login de usuario
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT id, name FROM usuario WHERE email = ? AND password = ?';

  db.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error('Error al autenticar usuario:', err.message);
      return res.status(500).json({ error: 'Error al autenticar usuario' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = results[0];
    const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });

    res.json({ userId: user.id, name: user.name, token });
  });
});

//GESTION DE PROYECTOS: "vista general de proyectos".
//GET: .
app.get('/api/proyectos', (req, res) => {
  const sql = 'SELECT * FROM proyectos';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//GESTION DE PROYECTOS: "detalles de proyecto".
//POST: es para crear uno nuevo.
app.post('/api/proyectos', (req, res) => {
  const { name, description, start_date, end_date, status } = req.body;
  const sql = `
    INSERT INTO proyectos (name, description, start_date, end_date, status) 
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [name, description, start_date, end_date, status],
    (err, result) => {
      if (err) {
        console.error('Error al crear el proyecto:', err.message);
        return res.status(500).json({ error: 'Error al crear el proyecto' });
      }
      res.json({ message: 'Proyecto creado con éxito', id: result.insertId });
    }
  );
});

//GET: obtener todos los proyectos.
app.get('/api/proyectos', (req, res) => {
  const sql = 'SELECT * FROM proyectos';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener proyectos:', err.message);
      return res.status(500).json({ error: 'Error al obtener proyectos' });
    }
    res.json(results);
  });
});

//GET: para obtenr un proyecto específico.
app.get('/api/proyectos/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM proyectos WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener el proyecto:', err.message);
      return res.status(500).json({ error: 'Error al obtener el proyecto' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json(results[0]);
  });
});

//PUT: actualizar un proyecto.
app.put('/api/proyectos/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, start_date, end_date, status } = req.body;
  const sql = `
    UPDATE proyectos
    SET name = ?, description = ?, start_date = ?, end_date = ?, status = ? 
    WHERE id = ?
  `;
  db.query(
    sql,
    [name, description, start_date, end_date, status, id],
    (err, result) => {
      if (err) {
        console.error('Error al actualizar proyecto:', err.message);
        return res.status(500).json({ error: 'Error al actualizar proyecto' });
      }
      res.json({ message: 'Proyecto actualizado con éxito' });
    }
  );
});

//DELETE: para eliminar un proyecto.
app.delete('/api/proyectos/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM proyectos WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Error al eliminar proyecto:', err.message);
      return res.status(500).json({ error: 'Error al eliminar proyecto' });
    }
    res.json({ message: 'Proyecto eliminado con éxito' });
  });
});

//GESTION DE PROYECTOS: "asignación de recursos".
//GET: abtener todos los recursos.
app.get('/api/recursos', (req, res) => {
  const sql = `
    SELECT recursos_proyecto.id, recursos_proyecto.role, recursos_proyecto.project_id AS projectId, recursos_proyecto.user_id AS userId, 
           proyectos.name AS projectName, usuario.name AS userName 
    FROM recursos_proyecto
    JOIN proyectos ON recursos_proyecto.project_id = proyectos.id
    JOIN usuario ON recursos_proyecto.user_id = usuario.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener recursos:', err.message);
      return res.status(500).json({ error: 'Error al obtener recursos' });
    }
    res.json(results);
  });
});

//POST: crear un recurso.
app.post('/api/proyectos/:projectId/recursos', (req, res) => {
  const { projectId } = req.params;
  const { userId, role } = req.body;
  const sql = `
    INSERT INTO recursos_proyecto (project_id, user_id, role) 
    VALUES (?, ?, ?)
  `;

  db.query(sql, [projectId, userId, role], (err, result) => {
    if (err) {
      console.error('Error al asignar recurso:', err.message);
      return res.status(500).json({ error: 'Error al asignar recurso' });
    }
    res.json({ message: 'Recurso asignado con éxito', id: result.insertId });
  });
});

//PUT: actualizar un recurso.
app.put('/api/recursos/:id', (req, res) => {
  const { id } = req.params;
  const { projectId, userId, role } = req.body;
  const sql = `
    UPDATE recursos_proyecto 
    SET project_id = ?, user_id = ?, role = ?
    WHERE id = ?
  `;

  db.query(sql, [projectId, userId, role, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar recurso:', err.message);
      return res.status(500).json({ error: 'Error al actualizar recurso' });
    }
    res.json({ message: 'Recurso actualizado con éxito' });
  });
});

//DELETE: eliminar un recurso.
app.delete('/api/recursos/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM recursos_proyecto WHERE id = ?`;

  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Error al eliminar recurso:', err.message);
      return res.status(500).json({ error: 'Error al eliminar recurso' });
    }
    res.json({ message: 'Recurso eliminado con éxito' });
  });
});

//GET: obtener el usuario.
app.get('/api/usuario', (req, res) => {
  const sql = 'SELECT id, name FROM usuario';
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

//PLANIFICACIÓN DE PRUEBAS: "Creación de Plan de Pruebas".
//POST:
app.post('/api/proyectos/:projectId/planes_prueba', (req, res) => {
  const { projectId } = req.params;
  const { name, description } = req.body;

  const sql =
    'INSERT INTO planes_prueba (project_id, name, description, created_at) VALUES (?, ?, ?, NOW())';
  db.query(sql, [projectId, name, description], (err, result) => {
    if (err) {
      console.error('Error en la consulta SQL:', err); //codigo extra
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'Plan de pruebas creado con éxito',
      id: result.insertId,
    });
  });
});

// GET: Obtener todos los planes de prueba
app.get('/api/planes_prueba', (req, res) => {
  const sql = `
    SELECT planes_prueba.id, planes_prueba.name, planes_prueba.description, planes_prueba.created_at, 
           planes_prueba.project_id, proyectos.name AS projectName
    FROM planes_prueba
    JOIN proyectos ON planes_prueba.project_id = proyectos.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener planes de prueba:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al obtener planes de prueba' });
    }
    res.json(results);
  });
});

// PUT: Actualizar un plan de prueba
app.put('/api/planes_prueba/:id', (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const sql = 'UPDATE planes_prueba SET name = ?, description = ? WHERE id = ?';

  db.query(sql, [name, description, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar plan de prueba:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al actualizar plan de prueba' });
    }
    res.json({ message: 'Plan de prueba actualizado con éxito' });
  });
});

// DELETE: Eliminar un plan de prueba
app.delete('/api/planes_prueba/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM planes_prueba WHERE id = ?';

  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Error al eliminar plan de prueba:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al eliminar plan de prueba' });
    }
    res.json({ message: 'Plan de prueba eliminado con éxito' });
  });
});

//PLANIFICACIÓN DE PRUEBAS: "Definición de Escenarios y Casos de Prueba".
//POST:
app.post('/api/planes_pruebas/:testPlanId/casos_pruebas', (req, res) => {
  const { testPlanId } = req.params;
  const { scenario, criteria, status } = req.body;

  const sql =
    'INSERT INTO casos_prueba (test_plan_id, scenario, criteria, status) VALUES (?, ?, ?, ?)';
  db.query(
    sql,
    [testPlanId, scenario, criteria, status || 'pending'],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: 'Caso de prueba creado con éxito',
        id: result.insertId,
      });
    }
  );
});

//GET:
app.get('/api/planes_pruebas', (req, res) => {
  const sql = 'SELECT id, name FROM planes_prueba';
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// GET: Listar todos los casos de prueba de un plan de prueba específico
app.get('/api/planes_pruebas/:testPlanId/casos_pruebas', (req, res) => {
  const { testPlanId } = req.params;
  const sql = 'SELECT * FROM casos_prueba WHERE test_plan_id = ?';
  db.query(sql, [testPlanId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// PUT: Actualizar un caso de prueba específico
app.put('/api/casos_pruebas/:id', (req, res) => {
  const { id } = req.params;
  const { scenario, criteria, status } = req.body;
  const sql =
    'UPDATE casos_prueba SET scenario = ?, criteria = ?, status = ? WHERE id = ?';
  db.query(sql, [scenario, criteria, status, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Caso de prueba actualizado con éxito' });
  });
});

// DELETE: Eliminar un caso de prueba específico
app.delete('/api/casos_pruebas/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM casos_prueba WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Caso de prueba eliminado con éxito' });
  });
});

//PLANIFICACIÓN DE PRUEBAS: "Visualización del calendario de pruebas".
// Obtener todos los eventos de pruebas programadas
app.get('/api/calendario/pruebas', (req, res) => {
  const sql = `
    SELECT 
      proyectos.id AS projectId, proyectos.name AS projectName, proyectos.start_date AS projectStartDate, proyectos.end_date AS projectEndDate,
      planes_prueba.id AS testPlanId, planes_prueba.name AS testPlanName,
      casos_prueba.id AS testCaseId, casos_prueba.scenario AS testCaseScenario, casos_prueba.status AS testCaseStatus
    FROM proyectos
    JOIN planes_prueba ON planes_prueba.project_id = proyectos.id
    JOIN casos_prueba ON casos_prueba.test_plan_id = planes_prueba.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener eventos de pruebas:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al obtener eventos de pruebas' });
    }
    res.json(results);
  });
});

// Filtrar eventos de pruebas por estado o proyecto
app.get('/api/calendario/pruebas/filtrar', (req, res) => {
  const { estado, proyectoId } = req.query;

  let sql = `
    SELECT 
      proyectos.id AS projectId, proyectos.name AS projectName, proyectos.start_date AS projectStartDate, proyectos.end_date AS projectEndDate,
      planes_prueba.id AS testPlanId, planes_prueba.name AS testPlanName,
      casos_prueba.id AS testCaseId, casos_prueba.scenario AS testCaseScenario, casos_prueba.status AS testCaseStatus
    FROM proyectos
    JOIN planes_prueba ON planes_prueba.project_id = proyectos.id
    JOIN casos_prueba ON casos_prueba.test_plan_id = planes_prueba.id
  `;

  const params = [];
  if (estado) {
    sql += ` WHERE casos_prueba.status = ?`;
    params.push(estado);
  }
  if (proyectoId) {
    sql += estado ? ` AND proyectos.id = ?` : ` WHERE proyectos.id = ?`;
    params.push(proyectoId);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error al filtrar eventos de pruebas:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al filtrar eventos de pruebas' });
    }
    res.json(results);
  });
});

//EJECUCIÓN DE PRUEBAS: "Ejecución Automatizada".
// Obtener datos combinados
app.get('/api/ejecuciones-combinadas', (req, res) => {
  const { projectId } = req.query;

  const sqlHistorial = `
    SELECT he.id, p.name AS proyecto, he.execution_date, he.status AS estado, he.details
    FROM historial_ejecucion he
    JOIN proyectos p ON he.project_id = p.id
    WHERE ? IS NULL OR he.project_id = ?
  `;

  const sqlResultados = `
    SELECT rp.id, cp.scenario, rp.result, rp.notes, rp.attachment, rp.created_at
    FROM resultados_prueba rp
    JOIN casos_prueba cp ON rp.test_case_id = cp.id
    JOIN planes_prueba pp ON cp.test_plan_id = pp.id
    JOIN proyectos p ON pp.project_id = p.id
    WHERE ? IS NULL OR p.id = ?
  `;

  db.query(
    sqlHistorial,
    [projectId || null, projectId || null],
    (err1, historial) => {
      if (err1) {
        console.error('Error al obtener historial:', err1.message);
        return res
          .status(500)
          .json({ error: 'Error al obtener historial de ejecuciones' });
      }

      db.query(
        sqlResultados,
        [projectId || null, projectId || null],
        (err2, resultados) => {
          if (err2) {
            console.error('Error al obtener resultados:', err2.message);
            return res
              .status(500)
              .json({ error: 'Error al obtener resultados de pruebas' });
          }

          // Combinar los datos en un solo arreglo
          const combinedData = [...historial, ...resultados];
          res.json(combinedData);
        }
      );
    }
  );
});

//EJECUCIÓN DE PRUEBAS: "Registro de Resultados de Pruebas".
//POST:
app.post('/api/resultados_pruebas', upload.single('attachment'), (req, res) => {
  const { test_case_id, result, notes } = req.body;
  const attachment = req.file ? req.file.filename : null;

  const sql =
    'INSERT INTO resultados_prueba (test_case_id, result, notes, attachment, created_at) VALUES (?, ?, ?, ?, NOW())';
  db.query(sql, [test_case_id, result, notes, attachment], (err, result) => {
    if (err) {
      console.error('Error en la consulta SQL:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'Resultado de prueba registrado con éxito',
      id: result.insertId,
    });
  });
});

//EJECUCIÓN DE PRUEBAS:
//GET:
app.get('/api/casos_pruebas', (req, res) => {
  const sql = 'SELECT id, scenario FROM casos_prueba';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener los casos de prueba:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al obtener los casos de prueba' });
    }
    res.json(results);
  });
});

//EJECUCIÓN DE PRUEBAS: "Estado de Ejecución".
// Endpoint para obtener el total de pruebas ejecutadas
app.get('/api/total_tests', (req, res) => {
  const query = 'SELECT COUNT(*) AS total_tests FROM resultados_prueba';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener el total de pruebas:', err);
      return res.status(500).send('Error al obtener el total de pruebas');
    }
    res.json({ total_tests: results[0].total_tests });
  });
});

// Endpoint para obtener el total de pruebas aprobadas
app.get('/api/successful_tests', (req, res) => {
  const query =
    "SELECT COUNT(*) AS successful_tests FROM resultados_prueba WHERE result = 'Aprobado'";

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener las pruebas aprobadas:', err);
      return res.status(500).send('Error al obtener las pruebas aprobadas');
    }
    res.json({ successful_tests: results[0].successful_tests });
  });
});

// Endpoint para obtener el total de pruebas fallidas
app.get('/api/failed_tests', (req, res) => {
  const query =
    "SELECT COUNT(*) AS failed_tests FROM resultados_prueba WHERE result = 'Fallido'";

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener las pruebas fallidas:', err);
      return res.status(500).send('Error al obtener las pruebas fallidas');
    }
    res.json({ failed_tests: results[0].failed_tests });
  });
});

// Endpoint para obtener el porcentaje de éxito
app.get('/api/success_percentage', (req, res) => {
  const query = `
    SELECT 
      (COUNT(CASE WHEN result = 'Aprobado' THEN 1 END) / COUNT(*)) * 100 AS success_percentage
    FROM resultados_prueba
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener el porcentaje de éxito:', err);
      return res.status(500).send('Error al obtener el porcentaje de éxito');
    }
    res.json({
      success_percentage: parseFloat(results[0].success_percentage.toFixed(2)),
    });
  });
});

// Endpoint para obtener las últimas ejecuciones de pruebas
app.get('/api/latest_tests', (req, res) => {
  const query = `
    SELECT test_case_id, result, created_at 
    FROM resultados_prueba 
    ORDER BY created_at DESC LIMIT 5
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener las últimas ejecuciones:', err);
      return res.status(500).send('Error al obtener las últimas ejecuciones');
    }
    res.json({ latest_tests: results });
  });
});

//GESTIÓN DE DEFECTOS: "Registros de defectos"
// GET: Obtener todos los defectos
app.get('/api/defectos', (req, res) => {
  const sql = `
    SELECT defectos.id, defectos.title, defectos.description, defectos.priority, defectos.type,
           defectos.status, defectos.created_at, defectos.resolved_at,
           proyectos.name AS projectName, casos_prueba.scenario AS testCaseScenario, usuario.name AS userName
    FROM defectos
    JOIN proyectos ON defectos.project_id = proyectos.id
    JOIN casos_prueba ON defectos.test_case_id = casos_prueba.id
    JOIN usuario ON defectos.assigned_to = usuario.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener defectos:', err.message);
      return res.status(500).json({ error: 'Error al obtener defectos' });
    }
    res.json(results);
  });
});

// POST: Crear un nuevo defecto
app.post('/api/defectos', (req, res) => {
  const {
    projectId,
    testCaseId,
    title,
    description,
    priority,
    type,
    assignedTo,
    status,
    createdAt,
    resolvedAt,
  } = req.body;
  const sql = `
    INSERT INTO defectos (project_id, test_case_id, title, description, priority, type, assigned_to, status, created_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [
      projectId,
      testCaseId,
      title,
      description,
      priority,
      type,
      assignedTo,
      status,
      createdAt,
      resolvedAt,
    ],
    (err, result) => {
      if (err) {
        console.error('Error al crear defecto:', err.message);
        return res.status(500).json({ error: 'Error al crear defecto' });
      }
      res.json({
        message: 'Defecto registrado con éxito',
        id: result.insertId,
      });
    }
  );
});

// PUT: Actualizar un defecto existente
app.put('/api/defectos/:id', (req, res) => {
  const { id } = req.params;
  const {
    projectId,
    testCaseId,
    title,
    description,
    priority,
    type,
    assignedTo,
    status,
    createdAt,
    resolvedAt,
  } = req.body;
  const sql = `
    UPDATE defectos 
    SET project_id = ?, test_case_id = ?, title = ?, description = ?, priority = ?, type = ?, assigned_to = ?, status = ?, created_at = ?, resolved_at = ?
    WHERE id = ?
  `;
  db.query(
    sql,
    [
      projectId,
      testCaseId,
      title,
      description,
      priority,
      type,
      assignedTo,
      status,
      createdAt,
      resolvedAt,
      id,
    ],
    (err) => {
      if (err) {
        console.error('Error al actualizar defecto:', err.message);
        return res.status(500).json({ error: 'Error al actualizar defecto' });
      }
      res.json({ message: 'Defecto actualizado con éxito' });
    }
  );
});

// DELETE: Eliminar un defecto
app.delete('/api/defectos/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM defectos WHERE id = ?`;
  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Error al eliminar defecto:', err.message);
      return res.status(500).json({ error: 'Error al eliminar defecto' });
    }
    res.json({ message: 'Defecto eliminado con éxito' });
  });
});

// Endpoint para obtener todos los proyectos
app.get('/api/proyectos', (req, res) => {
  const sql = 'SELECT id, name FROM proyectos';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener proyectos:', err);
      return res.status(500).json({ error: 'Error al obtener proyectos' });
    }
    res.json(results);
  });
});

// Endpoint para obtener los casos de prueba de un proyecto específico
app.get('/api/proyectos/:projectId/casos_prueba', (req, res) => {
  const { projectId } = req.params;

  const sql = `
    SELECT cp.id, cp.scenario 
    FROM casos_prueba cp
    JOIN planes_prueba pp ON cp.test_plan_id = pp.id
    WHERE pp.project_id = ?
  `;

  db.query(sql, [projectId], (err, results) => {
    if (err) {
      console.error('Error al obtener casos de prueba:', err);
      return res
        .status(500)
        .json({ error: 'Error al obtener casos de prueba' });
    }
    res.json(results);
  });
});

// Endpoint para obtener todos los usuarios
app.get('/api/usuarios', (req, res) => {
  const sql = 'SELECT id, name FROM usuario';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ error: 'Error al obtener usuarios' });
    }
    res.json(results);
  });
});

// Obtener un defecto específico por ID para editar
app.get('/api/defectos/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT defectos.id, defectos.title, defectos.description, defectos.priority, defectos.type, defectos.status,
           defectos.project_id, defectos.test_case_id, defectos.assigned_to, defectos.created_at,
           proyectos.name AS projectName,
           casos_prueba.scenario AS testCaseScenario,
           usuario.name AS userName
    FROM defectos
    LEFT JOIN proyectos ON defectos.project_id = proyectos.id
    LEFT JOIN casos_prueba ON defectos.test_case_id = casos_prueba.id
    LEFT JOIN usuario ON defectos.assigned_to = usuario.id
    WHERE defectos.id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al obtener el defecto:', err.message);
      return res.status(500).json({ error: 'Error al obtener el defecto' });
    }
    res.json(result[0]);
  });
});

//GESTIÓN DE DEFECTOS: "Seguimiento y Estado del Defecto".
app.get('/api/seguimiento-defectos', (req, res) => {
  const { projectId, status, priority } = req.query;

  let sql = `
    SELECT defectos.id, defectos.title, defectos.status, defectos.priority, defectos.created_at, defectos.resolved_at,
           proyectos.name AS projectName, usuario.name AS userName
    FROM defectos
    LEFT JOIN proyectos ON defectos.project_id = proyectos.id
    LEFT JOIN usuario ON defectos.assigned_to = usuario.id
    WHERE 1 = 1
  `;

  const params = [];
  if (projectId) {
    sql += ' AND defectos.project_id = ?';
    params.push(projectId);
  }
  if (status) {
    sql += ' AND defectos.status = ?';
    params.push(status);
  }
  if (priority) {
    sql += ' AND defectos.priority = ?';
    params.push(priority);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error al obtener defectos:', err.message);
      return res.status(500).json({ error: 'Error al obtener defectos' });
    }
    res.json(results);
  });
});

// GET: Obtener todos los defectos con sus relaciones
app.get('/api/defectos', (req, res) => {
  const sql = `
    SELECT defectos.id, defectos.title, defectos.description, defectos.priority, defectos.type,
           defectos.status, defectos.created_at, defectos.resolved_at,
           proyectos.name AS projectName, casos_prueba.scenario AS testCaseScenario, usuario.name AS userName
    FROM defectos
    JOIN proyectos ON defectos.project_id = proyectos.id
    JOIN casos_prueba ON defectos.test_case_id = casos_prueba.id
    JOIN usuario ON defectos.assigned_to = usuario.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener defectos:', err.message);
      return res.status(500).json({ error: 'Error al obtener defectos' });
    }
    res.json(results);
  });
});

////////////////////////////////////////////////////////////////////
//GESTIÓN DE DEFECTOS: Verificación de Corrección.
// Obtener todas las notas de verificación con información del defecto
app.get('/api/notas_verificacion', (req, res) => {
  const sql = `
    SELECT notas_verificacion.id, notas_verificacion.defect_id, notas_verificacion.verified_at, notas_verificacion.notes, notas_verificacion.verified,
           defectos.title AS defectTitle
    FROM notas_verificacion
    JOIN defectos ON notas_verificacion.defect_id = defectos.id
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener notas de verificación:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al obtener notas de verificación' });
    }
    res.json(results);
  });
});

// Registrar una nueva nota de verificación
app.post('/api/notas_verificacion', (req, res) => {
  const { defectId, verifiedAt, notes, verified } = req.body;
  const sql = `
    INSERT INTO notas_verificacion (defect_id, verified_at, notes, verified)
    VALUES (?, ?, ?, ?)
  `;
  db.query(
    sql,
    [defectId, verifiedAt, notes, verified ? 1 : 0],
    (err, result) => {
      if (err) {
        console.error('Error al registrar nota de verificación:', err.message);
        return res
          .status(500)
          .json({ error: 'Error al registrar nota de verificación' });
      }
      res.json({ message: 'Nota registrada con éxito', id: result.insertId });
    }
  );
});

// Actualizar una nota de verificación existente
app.put('/api/notas_verificacion/:id', (req, res) => {
  const { id } = req.params;
  const { defectId, verifiedAt, notes, verified } = req.body;
  const sql = `
    UPDATE notas_verificacion 
    SET defect_id = ?, verified_at = ?, notes = ?, verified = ?
    WHERE id = ?
  `;
  db.query(sql, [defectId, verifiedAt, notes, verified ? 1 : 0, id], (err) => {
    if (err) {
      console.error('Error al actualizar nota de verificación:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al actualizar nota de verificación' });
    }
    res.json({ message: 'Nota actualizada con éxito' });
  });
});

// Eliminar una nota de verificación
app.delete('/api/notas_verificacion/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM notas_verificacion WHERE id = ?`;
  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Error al eliminar nota de verificación:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al eliminar nota de verificación' });
    }
    res.json({ message: 'Nota eliminada con éxito' });
  });
});

////INFORMES Y MÉTRICAS: "Informes de Calidad".
// GET: Obtener todos los informes de calidad
app.get('/api/informes_calidad', (req, res) => {
  const sql = `
    SELECT ic.id, ic.success_rate, ic.defects_found, ic.defects_resolved,
           ic.avg_resolution_time, ic.test_coverage, ic.created_at,
           p.name AS projectName, ic.project_id
    FROM informes_calidad ic
    JOIN proyectos p ON ic.project_id = p.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener informes de calidad:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al obtener informes de calidad' });
    }
    res.json(results);
  });
});

// POST: Crear un nuevo informe de calidad
app.post('/api/informes_calidad', (req, res) => {
  const {
    projectId,
    successRate,
    defectsFound,
    defectsResolved,
    avgResolutionTime,
    testCoverage,
    createdAt,
  } = req.body;

  const sql = `
    INSERT INTO informes_calidad
    (project_id, success_rate, defects_found, defects_resolved, avg_resolution_time, test_coverage, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      projectId,
      successRate,
      defectsFound,
      defectsResolved,
      avgResolutionTime,
      testCoverage,
      createdAt,
    ],
    (err, result) => {
      if (err) {
        console.error('Error al crear informe de calidad:', err.message);
        return res
          .status(500)
          .json({ error: 'Error al crear informe de calidad' });
      }
      res.json({
        message: 'Informe de calidad registrado con éxito',
        id: result.insertId,
      });
    }
  );
});

// PUT: Actualizar un informe de calidad existente
app.put('/api/informes_calidad/:id', (req, res) => {
  const { id } = req.params;
  const {
    projectId,
    successRate,
    defectsFound,
    defectsResolved,
    avgResolutionTime,
    testCoverage,
    createdAt,
  } = req.body;

  const sql = `
    UPDATE informes_calidad
    SET project_id = ?, success_rate = ?, defects_found = ?, defects_resolved = ?, 
        avg_resolution_time = ?, test_coverage = ?, created_at = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      projectId,
      successRate,
      defectsFound,
      defectsResolved,
      avgResolutionTime,
      testCoverage,
      createdAt,
      id,
    ],
    (err) => {
      if (err) {
        console.error('Error al actualizar informe de calidad:', err.message);
        return res
          .status(500)
          .json({ error: 'Error al actualizar informe de calidad' });
      }
      res.json({ message: 'Informe de calidad actualizado con éxito' });
    }
  );
});

// DELETE: Eliminar un informe de calidad
app.delete('/api/informes_calidad/:id', (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM informes_calidad WHERE id = ?`;

  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Error al eliminar informe de calidad:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al eliminar informe de calidad' });
    }
    res.json({ message: 'Informe de calidad eliminado con éxito' });
  });
});

//INFORMES Y MÉTRICAS: "Métricas de Pruebas".
// Obtener métricas de pruebas para un proyecto específico
app.get('/api/metricas/pruebas/:projectId', (req, res) => {
  const { projectId } = req.params;

  // Consultas SQL
  const sqlCoverage = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status IN ('Aprobado', 'Fallido') THEN 1 ELSE 0 END) AS covered
    FROM casos_prueba
    WHERE test_plan_id IN (SELECT id FROM planes_prueba WHERE project_id = ?)
  `;

  const sqlDefects = `
    SELECT 
      COUNT(*) AS defectsFound,
      SUM(CASE WHEN status IN ('Resuelto', 'Verificado') THEN 1 ELSE 0 END) AS defectsResolved
    FROM defectos
    WHERE project_id = ?
  `;

  const sqlResolutionTimes = `
    SELECT 
      status AS label,
      AVG(TIMESTAMPDIFF(DAY, created_at, resolved_at)) AS avgTime
    FROM defectos
    WHERE project_id = ?
    GROUP BY status
  `;

  db.query(sqlCoverage, [projectId], (err, coverageResults) => {
    if (err) {
      console.error('Error al obtener cobertura de pruebas:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al obtener cobertura de pruebas' });
    }

    db.query(sqlDefects, [projectId], (err, defectsResults) => {
      if (err) {
        console.error('Error al obtener defectos:', err.message);
        return res.status(500).json({ error: 'Error al obtener defectos' });
      }

      db.query(sqlResolutionTimes, [projectId], (err, resolutionResults) => {
        if (err) {
          console.error('Error al obtener tiempos de resolución:', err.message);
          return res
            .status(500)
            .json({ error: 'Error al obtener tiempos de resolución' });
        }

        const response = {
          covered: coverageResults[0].covered,
          uncovered: coverageResults[0].total - coverageResults[0].covered,
          defectsFound: defectsResults[0].defectsFound,
          defectsResolved: defectsResults[0].defectsResolved,
          resolutionMetrics: {
            labels: resolutionResults.map((r) => r.label),
            data: resolutionResults.map((r) => r.avgTime),
          },
        };
        res.json(response);
      });
    });
  });
});

//INFORMES Y MÉTRICAS: Exportación de Informes.
// Obtener informes de calidad y calcular métricas
app.get('/api/informes-calidad', (req, res) => {
  const sql = `
    SELECT ic.id, p.name AS project_name, ic.success_rate, ic.defects_found, 
           ic.defects_resolved, ic.avg_resolution_time, ic.test_coverage, 
           ic.created_at
    FROM informes_calidad ic
    JOIN proyectos p ON ic.project_id = p.id
`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener informes de calidad:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al obtener informes de calidad' });
    }

    res.json(results);
  });
});

// Exportar informe a PDF o Excel
app.get('/api/informes-calidad/exportar/:formato', (req, res) => {
  const { formato } = req.params;

  const sql = `
    SELECT ic.id, p.name AS project_name, ic.success_rate, ic.defects_found, 
           ic.defects_resolved, ic.avg_resolution_time, ic.test_coverage, 
           ic.created_at
    FROM informes_calidad ic
    JOIN proyectos p ON ic.project_id = p.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al exportar informes:', err.message);
      return res.status(500).json({ error: 'Error al exportar informes' });
    }

    if (formato === 'pdf') {
      // Lógica para exportar PDF (usando `pdfkit` o similar)
      exportToPDF(results, res);
    } else if (formato === 'excel') {
      // Lógica para exportar Excel (usando `exceljs` o similar)
      exportToExcel(results, res);
    } else {
      res.status(400).json({ error: 'Formato no soportado' });
    }
  });
});

// Función para formatear la fecha
const formatFecha = (fecha) => {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES'); // Formato dd/mm/aaaa
};

const exportToPDF = (data, res) => {
  const doc = new PDFDocument();
  const pathLogo = 'logo.png'; // Asegúrate de tener el logo en la ruta correcta

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="informe-calidad.pdf"'
  );

  doc.pipe(res);

  //Encapsulando el encabezado.
  const addHeder = () => {
    // Agregar el logo
    doc.image(pathLogo, 35, 35, { width: 50 });

    // Título del informe

    doc.moveDown(-2); // Espaciado
    doc.fillColor('#0f56a3').fontSize(20).text('GCMax', {
      align: 'center',
    });
    doc
      .fillColor('#0f56a3')
      .fontSize(16)
      .text('Sistema de gestión de pruebas y control de calidad', {
        align: 'center',
      });
    doc.moveDown(1); // Espaciado
  };

  addHeder();

  // Agregar los proyectos con sus datos
  data.forEach((row, index) => {
    // Título para cada proyecto
    doc
      .fillColor('#0a2858')
      .fontSize(14)
      .text(`Proyecto ${index + 1}: ${row.project_name}`, {
        underline: true,
      });
    doc.moveDown(0.5);

    // Tabla de datos
    //doc.fontSize(12).text(`Proyecto: ${row.project_name}`);
    doc
      .fillColor('#000000')
      .fontSize(12)
      .text(`Tasa de Éxito: ${row.success_rate}`);
    doc.text(`Defectos Encontrados: ${row.defects_found}`);
    doc.text(`Defectos Resueltos: ${row.defects_resolved}`);
    doc.text(`Tiempo Promedio de Resolución: ${row.avg_resolution_time}`);
    doc.text(`Cobertura de Pruebas: ${row.test_coverage}`);
    doc.text(`Fecha: ${formatFecha(row.created_at)}`);
    doc.moveDown(1.5); // Espaciado entre proyectos
  });

  // Función para agregar el pie de página
  const addFooter = () => {
    doc
      .fillColor('#0a2858')
      .fontSize(12)
      .text(
        '          f. ____________________          Vo.Bo. ____________________',
        100,
        680
      )
      .text(
        '          Lugar: ____________________          Fecha: ____________________',
        72,
        706
      );
  };

  addFooter();
  doc.end();
};

const exportToExcel = (data, res) => {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Informe de Calidad');

  worksheet.columns = [
    { header: 'Proyecto', key: 'project_name', width: 20 },
    { header: 'Tasa de Éxito', key: 'success_rate', width: 15 },
    { header: 'Defectos Encontrados', key: 'defects_found', width: 20 },
    { header: 'Defectos Resueltos', key: 'defects_resolved', width: 20 },
    { header: 'Tiempo de Resolución', key: 'avg_resolution_time', width: 20 },
    { header: 'Cobertura de Pruebas', key: 'test_coverage', width: 20 },
    { header: 'Fecha de Creación', key: 'created_at', width: 20 },
  ];

  // Añadimos los datos a la hoja de Excel
  worksheet.addRows(data);

  // Configuración de los encabezados HTTP para el archivo Excel
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="informe-calidad.xlsx"'
  );

  // Escribimos el archivo Excel en la respuesta HTTP
  workbook.xlsx.write(res).then(() => res.end());
};

//INTEGRACIÓN CONTÍNUA: "Configuración de Integración Contínua".
//GET: obtener todas las configuraciones.
app.get('/api/configuracion', (req, res) => {
  const sql = `
    SELECT c.id, c.project_id, c.ci_tool, c.server_url, c.api_token, 
           c.username, c.auto_execution_enabled, c.created_at, 
           p.name AS projectName
    FROM configuracion c
    JOIN proyectos p ON c.project_id = p.id
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener configuraciones:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al obtener configuraciones' });
    }
    res.json(results);
  });
});

//POST: crear nueva configuración.
app.post('/api/configuracion', (req, res) => {
  const {
    projectId,
    ciTool,
    serverUrl,
    apiToken,
    username,
    autoExecutionEnabled,
  } = req.body;

  const sql = `
    INSERT INTO configuracion 
    (project_id, ci_tool, server_url, api_token, username, auto_execution_enabled) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [
    projectId,
    ciTool,
    serverUrl,
    apiToken,
    username,
    autoExecutionEnabled,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error al crear configuración:', err.message);
      return res.status(500).json({ error: 'Error al crear configuración' });
    }
    res.json({ message: 'Configuración creada con éxito' });
  });
});

//PUT: actualizar configuración.
app.put('/api/configuracion/:id', (req, res) => {
  const { id } = req.params;
  const {
    projectId,
    ciTool,
    serverUrl,
    apiToken,
    username,
    autoExecutionEnabled,
  } = req.body;

  const sql = `
    UPDATE configuracion 
    SET project_id = ?, ci_tool = ?, server_url = ?, api_token = ?, 
        username = ?, auto_execution_enabled = ? 
    WHERE id = ?
  `;
  const values = [
    projectId,
    ciTool,
    serverUrl,
    apiToken,
    username,
    autoExecutionEnabled,
    id,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error al actualizar configuración:', err.message);
      return res
        .status(500)
        .json({ error: 'Error al actualizar configuración' });
    }
    res.json({ message: 'Configuración actualizada con éxito' });
  });
});

//DELETE: eliminar configuración.
app.delete('/api/configuracion/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM configuracion WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar configuración:', err.message);
      return res.status(500).json({ error: 'Error al eliminar configuración' });
    }
    res.json({ message: 'Configuración eliminada con éxito' });
  });
});

//INTEGRACIÓN CONTÍNUA: "Ejecución Automáticas de Pruebas".
// Obtener todos los registros del historial de ejecución
app.get('/api/historial-ejecucion', (req, res) => {
  const sql = `
    SELECT h.id, h.project_id, h.execution_date, h.status, h.details, p.name AS project_name
    FROM historial_ejecucion h
    JOIN proyectos p ON h.project_id = p.id
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener el historial:', err.message);
      return res.status(500).json({ error: 'Error al obtener el historial' });
    }
    res.json(results);
  });
});

// Obtener un registro específico para edición
app.get('/api/historial-ejecucion/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT h.id, h.project_id, h.execution_date, h.status, h.details, p.name AS project_name
    FROM historial_ejecucion h
    JOIN proyectos p ON h.project_id = p.id
    WHERE h.id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener el registro:', err.message);
      return res.status(500).json({ error: 'Error al obtener el registro' });
    }
    res.json(results[0]);
  });
});

// Crear un nuevo registro
app.post('/api/historial-ejecucion', (req, res) => {
  const { projectId, executionDate, status, details } = req.body;
  const sql = `
    INSERT INTO historial_ejecucion (project_id, execution_date, status, details)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [projectId, executionDate, status, details], (err, result) => {
    if (err) {
      console.error('Error al registrar ejecución:', err.message);
      return res.status(500).json({ error: 'Error al registrar ejecución' });
    }
    res.json({ message: 'Ejecución registrada con éxito' });
  });
});

// Actualizar un registro
app.put('/api/historial-ejecucion/:id', (req, res) => {
  const { id } = req.params;
  const { projectId, executionDate, status, details } = req.body;
  const sql = `
    UPDATE historial_ejecucion
    SET project_id = ?, execution_date = ?, status = ?, details = ?
    WHERE id = ?
  `;
  db.query(sql, [projectId, executionDate, status, details, id], (err) => {
    if (err) {
      console.error('Error al actualizar ejecución:', err.message);
      return res.status(500).json({ error: 'Error al actualizar ejecución' });
    }
    res.json({ message: 'Ejecución actualizada con éxito' });
  });
});

// Eliminar un registro
app.delete('/api/historial-ejecucion/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM historial_ejecucion WHERE id = ?`;
  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Error al eliminar ejecución:', err.message);
      return res.status(500).json({ error: 'Error al eliminar ejecución' });
    }
    res.json({ message: 'Ejecución eliminada con éxito.' });
  });
});
