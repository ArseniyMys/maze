/*prettier-ignore*/
const {Engine, Render, Runner, World, Bodies, Body, Events} = Matter;

const borderLength = 10;
const wallLength = 5;

const [width, height] = [window.innerWidth, window.innerHeight - borderLength];

const cellSize = 100;
const cellsHorizontal = Math.round(width / cellSize);
const cellsVertical = Math.round(height / cellSize);

const unitLengthX = width / cellsHorizontal;
const unitLengthY = height / cellsVertical;

const engine = Engine.create();
engine.world.gravity.y = 0;
const { world } = engine;
const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    wireframes: false,
    width: width,
    height: height,
  },
});
Render.run(render);
Runner.run(Runner.create(), engine);

// Borders
const borders = [
  Bodies.rectangle(width / 2, 0, width, borderLength, {
    isStatic: true,
    label: 'border',
    render: { fillStyle: 'grey' },
  }),
  Bodies.rectangle(width / 2, height, width, borderLength, {
    isStatic: true,
    label: 'border',
    render: { fillStyle: 'grey' },
  }),
  Bodies.rectangle(0, height / 2, borderLength, height, {
    isStatic: true,
    label: 'border',
    render: { fillStyle: 'grey' },
  }),
  Bodies.rectangle(width, height / 2, borderLength, height, {
    isStatic: true,
    label: 'border',
    render: { fillStyle: 'grey' },
  }),
];
World.add(world, borders);

// Maze generations

const shuffle = arr => {
  let counter = arr.length;

  while (counter > 0) {
    const index = Math.floor(Math.random() * counter);

    counter--;

    const temp = arr[counter];
    arr[counter] = arr[index];
    arr[index] = temp;
  }

  return arr;
};

const grid = Array(cellsVertical)
  .fill(null)
  .map(() => Array(cellsHorizontal).fill(false));

const verticals = Array(cellsVertical)
  .fill(null)
  .map(() => Array(cellsHorizontal - 1).fill(false));

const horizontals = Array(cellsVertical - 1)
  .fill(null)
  .map(() => Array(cellsHorizontal).fill(false));

const start = {
  row: Math.floor(Math.random() * cellsVertical),
  column: Math.floor(Math.random() * cellsHorizontal),
};

const recurse = (row, column) => {
  // If visited at [row, column], return
  if (grid[row][column]) return;

  // Mark this cell as visited
  grid[row][column] = true;

  // Assemble randomly-ordered list of neighbours
  const neighbours = shuffle([
    [row - 1, column, 'up'],
    [row + 1, column, 'down'],
    [row, column + 1, 'right'],
    [row, column - 1, 'left'],
  ]);

  // For each neighbour...
  for (let neighbour of neighbours) {
    const [nextRow, nextColumn, direction] = neighbour;

    // If neighbour is out of bounds
    if (
      nextRow < 0 ||
      nextRow >= cellsVertical ||
      nextColumn < 0 ||
      nextColumn >= cellsHorizontal
    )
      continue;

    // If we have visited that neighbour, continue to next neighbour
    if (grid[nextRow][nextColumn]) continue;

    // Remove a wall from either horizontals or verticals
    if (direction === 'up') horizontals[row - 1][column] = true;
    if (direction === 'down') horizontals[row][column] = true;
    if (direction === 'right') verticals[row][column] = true;
    if (direction === 'left') verticals[row][column - 1] = true;

    recurse(nextRow, nextColumn);
  }

  // Visit that next cell
};
recurse(start.row, start.column);

// Walls
const walls = [];
horizontals.forEach((row, rowIndex) => {
  row.forEach((wall, columnIndex) => {
    if (!wall) {
      walls.push(
        Bodies.rectangle(
          columnIndex * unitLengthX + unitLengthX / 2,
          rowIndex * unitLengthY + unitLengthY,
          unitLengthX,
          wallLength,
          { isStatic: true, label: 'wall', render: { fillStyle: 'grey' } }
        )
      );
    }
  });
});
verticals.forEach((row, rowIndex) => {
  row.forEach((wall, columnIndex) => {
    if (!wall) {
      walls.push(
        Bodies.rectangle(
          columnIndex * unitLengthX + unitLengthX,
          rowIndex * unitLengthY + unitLengthY / 2,
          wallLength,
          unitLengthY,
          { isStatic: true, label: 'wall', render: { fillStyle: 'grey' } }
        )
      );
    }
  });
});
World.add(world, walls);

// Goal
const goalSize = Math.min(unitLengthX, unitLengthY) / 2;
const goal = Bodies.rectangle(
  width - unitLengthX / 2,
  height - unitLengthY / 2,
  goalSize,
  goalSize,
  { isStatic: true, label: 'goal', render: { fillStyle: 'blue' } }
);
World.add(world, goal);

// Ball
const ballRadius = Math.min(unitLengthX, unitLengthY) / 4;
const ball = Bodies.circle(unitLengthX / 2, unitLengthY / 2, ballRadius, {
  isStatic: false,
  label: 'ball',
  render: {
    fillStyle: 'yellow',
  },
});
World.add(world, ball);

document.addEventListener('keydown', e => {
  const { x, y } = ball.velocity;

  if (e.key === 'w' || e.key === 'ArrowUp')
    Body.setVelocity(ball, { x, y: y - 5 });

  if (e.key === 's' || e.key === 'ArrowDown')
    Body.setVelocity(ball, { x, y: y + 5 });

  if (e.key === 'd' || e.key === 'ArrowRight')
    Body.setVelocity(ball, { x: x + 5, y });

  if (e.key === 'a' || e.key === 'ArrowLeft')
    Body.setVelocity(ball, { x: x - 5, y });
});

document.addEventListener('keydown', function () {
  document.querySelector('.rules').classList.add('hidden')
});

// Win condition
Events.on(engine, 'collisionStart', e => {
  e.pairs.forEach(collision => {
    const labels = ['ball', 'goal'];

    if (
      labels.includes(collision.bodyA.label) &&
      labels.includes(collision.bodyB.label)
    ) {
      world.gravity.y = 1;

      world.bodies.forEach(body => {
        if (body.label === 'border') return;

        Body.setStatic(body, false);
      });

      document.querySelector('.winner').classList.remove('hidden');

      document.addEventListener('keydown', e => {
        const { x, y } = ball.velocity;

        if (e.key === 'w' || e.key === 'ArrowUp') {
          world.gravity.y = -1;
          world.gravity.x = 0;
        }

        if (e.key === 's' || e.key === 'ArrowDown') {
          world.gravity.y = 1;
          world.gravity.x = 0;
        }

        if (e.key === 'd' || e.key === 'ArrowRight') {
          world.gravity.x = 1;
          world.gravity.y = 0;
        }

        if (e.key === 'a' || e.key === 'ArrowLeft') {
          world.gravity.x = -1;
          world.gravity.y = 0;
        }
      });
    }
  });
});
