import React from 'react';

interface ToDo {
  id: string;
  title: string;
  content: string;
}

interface ToDoState {
  todos: ToDo[];
}

interface InjectedProps {
  onAdd: () => void;
  onRemove: (id: string) => void;
  todos: ToDo[];
}

export interface AllProps extends InjectedProps {
  style: React.CSSProperties;
}

export default <P extends InjectedProps>(
  Component: React.ComponentType<P>
) => class extends React.Component<Omit<P, keyof InjectedProps>, ToDoState> {
  state = { todos: [] };

  onRemove = (id: string) => () => {
    const filteredToDos = (this.state.todos as ToDo[]).filter((todo) => (todo as ToDo).id !== id);
    this.setState({ todos: filteredToDos });
  }

  onAdd = () => {
    const todo = {
      title: '',
      content: '',
      id: `${Date.now}`
    };
    this.setState((prev) => { todos: [...prev.todos, todo] });
  }

  render() {
    return (
      <Component
        { ...this.props as P }
        todos={this.state.todos}
        onAdd={this.onAdd}
        onRemove={this.onRemove}
      />
    )
  }
}
