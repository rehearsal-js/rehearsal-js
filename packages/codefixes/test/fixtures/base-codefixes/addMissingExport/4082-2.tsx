import makeToDo, { AllProps } from './4082-2-import';

const ToDo = (props: AllProps) => {
  return (
    <div style={props.style}>
      {props.todos.map((todo) => (
        <div key={todo.id}>
          <div>{todo.title}</div>
          <div>{todo.content}</div>
          <button data-id={todo.id} onClick={() => props.onRemove(todo.id)}>
            Remove
          </button>
        </div>
      ))}
      <button onClick={props.onAdd}>Add</button>
    </div>
  );
};
export default makeToDo(ToDo);
