const format = require('date-fns/format')
const isValid = require('date-fns/isValid')
const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'todoApplication.db')
let db = null

const initialDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initialDBAndServer()

const convertDBResponseToObject = data => {
  return {
    id: data.id,
    todo: data.todo,
    priority: data.priority,
    status: data.status,
    category: data.category,
    dueDate: data.due_date,
  }
}

app.get('/todos/', async (request, response) => {
  const {search_q, status, priority, category, date} = request.query

  const getPriority = `
  SELECT * FROM todo WHERE priority = "${priority}";`

  const getStatus = `
  SELECT * FROM todo WHERE status = "${status}";`

  const getCategory = `
  SELECT * FROM todo WHERE category = "${category}";`

  const getSearch = `
  SELECT * FROM todo WHERE todo LIKE "%${search_q}%";`

  const getDueDate = `
  SELECT * FROM todo WHERE due_date = ${date};`

  const isStatus =
    status !== 'TO DO' && status !== 'IN PROGRESS' && status !== 'DONE'

  const isPriority =
    priority !== 'HIGH' && priority !== 'MEDIUM' && priority !== 'LOW'

  const isCategory =
    category !== 'WORK' && category !== 'HOME' && category !== 'LEARNING'

  if (category !== undefined && priority !== undefined) {
    if (isCategory) {
      response.status(400)
      response.send('Invalid Todo Category')
    } else if (isPriority) {
      response.status(400)
      response.send('Invalid Todo Priority')
    } else {
      const getCategoryAndPriority = `
      SELECT * FROM todo WHERE category = "${category}" AND priority = "${priority}";`

      const categoryAndPriority = await db.all(getCategoryAndPriority)

      response.send(
        categoryAndPriority.map(everyObject =>
          convertDBResponseToObject(everyObject),
        ),
      )
    }
  } else if (priority !== undefined && status !== undefined) {
    if (isPriority) {
      response.status(400)
      response.send('Invalid Todo priority')
    } else if (isStatus) {
      response.status(400)
      response.send('Invalid Todo Status')
    } else {
      const getPriorityAndStatus = `
      SELECT * FROM todo WHERE priority = "${priority}" AND status = "${status}";`

      const priorityAndStatus = await db.all(getPriorityAndStatus)

      response.send(
        priorityAndStatus.map(everyObject =>
          convertDBResponseToObject(everyObject),
        ),
      )
    }
  } else if (category !== undefined && status !== undefined) {
    if (isCategory) {
      response.status(400)
      response.send('Invalid Todo Category')
    } else if (isStatus) {
      response.status(400)
      response.send('Invalid Todo Status')
    } else {
      const getCategoryAndStatus = `
      SELECT * FROM todo WHERE category = "${category}" AND status = "${status}";`

      const categoryAndStatus = await db.all(getCategoryAndStatus)

      response.send(
        categoryAndStatus.map(everyObject =>
          convertDBResponseToObject(everyObject),
        ),
      )
    }
  } else if (category !== undefined) {
    const newCategory = await db.all(getCategory)

    if (isCategory) {
      response.status(400)
      response.send('Invalid Todo Category')
    } else {
      response.send(
        newCategory.map(everyObject => convertDBResponseToObject(everyObject)),
      )
    }
  } else if (priority !== undefined) {
    const newPriority = await db.all(getPriority)

    if (isPriority) {
      response.status(400)
      response.send('Invalid Todo Priority')
    } else {
      response.send(
        newPriority.map(everyObject => convertDBResponseToObject(everyObject)),
      )
    }
  } else if (status !== undefined) {
    const newStatus = await db.all(getStatus)

    if (isStatus) {
      response.status(400)
      response.send('Invalid Todo Status')
    } else {
      response.send(
        newStatus.map(everyObject => convertDBResponseToObject(everyObject)),
      )
    }
  } else if (search_q !== undefined) {
    const newSearch = await db.all(getSearch)

    response.send(
      newSearch.map(everyObject => convertDBResponseToObject(everyObject)),
    )
  }
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const getSpecificTodo = `
  SELECT * FROM todo WHERE id = ${todoId};`

  const specificTodo = await db.get(getSpecificTodo)
  console.log(specificTodo)
  response.send(convertDBResponseToObject(specificTodo))
})

app.get('/agenda/', async (request, response) => {
  const {date} = request.query

  const isValidDate = isValid(new Date(date))

  if (!isValidDate) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    const validDate = format(new Date(isValidDate), 'YYYY-MM-dd')

    const getSpecificDueDate = `
  SELECT * FROM todo WHERE due_date = "${validDate}";`

    const specificDueDate = await db.get(getSpecificDueDate)

    response.send(convertDBResponseToObject(specificDueDate))
  }
})

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body

  const isStatus =
    status !== 'TO DO' && status !== 'IN PROGRESS' && status !== 'DONE'

  const isPriority =
    priority !== 'HIGH' && priority !== 'MEDIUM' && priority !== 'LOW'

  const isCategory =
    category !== 'WORK' && category !== 'HOME' && category !== 'LEARNING'

  const isValidDate = isValid(new Date(dueDate))

  if (isPriority) {
    response.status(400)
    response.send('Invalid Todo Priority')
  } else if (isCategory) {
    response.status(400)
    response.send('Invalid Todo Category')
  } else if (isStatus) {
    response.status(400)
    response.send('Invalid Todo Status')
  } else if (!isValidDate) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    const date = format(new Date(dueDate), 'yyyy-MM-dd')

    const createNewTodo = `
    INSERT INTO todo (id, todo, category, priority, status, due_date) VALUES (${id}, "${todo}","${category}", "${priority}", "${status}", "${date}");`

    await db.run(createNewTodo)

    response.send('Todo Successfully Added')
  }
})

app.put('/todos/:todoId/', async (request, response) => {
  const {priority, status, category, dueDate, todo} = request.body
  const {todoId} = request.params

  const isStatus =
    status !== 'TO DO' && status !== 'IN PROGRESS' && status !== 'DONE'

  const isPriority =
    priority !== 'HIGH' && priority !== 'MEDIUM' && priority !== 'LOW'

  const isCategory =
    category !== 'WORK' && category !== 'HOME' && category !== 'LEARNING'

  const isValidDate = isValid(new Date(dueDate))

  if (status !== undefined) {
    if (isStatus) {
      response.status(400)
      response.send('Invalid Todo Status')
    } else {
      const updateNewStatus = `
      UPDATE todo SET status = "${status}" WHERE id = ${todoId};`

      await db.run(updateNewStatus)

      response.send('Status Updated')
    }
  } else if (priority !== undefined) {
    if (isPriority) {
      response.status(400)
      response.send('Invalid Todo Priority')
    } else {
      const updateNewPriority = `
      UPDATE todo SET priority = "${priority}" WHERE id = ${todoId};`

      await db.run(updateNewPriority)

      response.send('Priority Updated')
    }
  } else if (category !== undefined) {
    if (isCategory) {
      response.status(400)
      response.send('Invalid Todo Category')
    } else {
      const updateNewCategory = `
      UPDATE todo SET category = "${category}" WHERE id = ${todoId};`

      await db.run(updateNewCategory)

      response.send('Category Updated')
    }
  } else if (dueDate !== undefined) {
    if (!isValidDate) {
      response.status(400)
      response.send('Invalid Due Date')
    } else {
      const date = format(new Date(dueDate), 'yyyy-MM-dd')

      const updateNewDueDate = `
      UPDATE todo SET due_date = "${date}" WHERE id = ${todoId};`

      await db.run(updateNewDueDate)

      response.send('Due Date Updated')
    }
  } else if (todo !== undefined) {
    const updateNewTodo = `
      UPDATE todo SET todo = "${todo}" WHERE id = ${todoId};`

    await db.run(updateNewTodo)

    response.send('Todo Updated')
  }
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const deleteSpecificTodo = `
  DELETE FROM todo WHERE id = ${todoId};`

  await db.run(deleteSpecificTodo)

  response.send('Todo Deleted')
})

module.exports = app
