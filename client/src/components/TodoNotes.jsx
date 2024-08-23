import React from "react";
import "./TodoNotes.css";
import trash from "../assets/trash.svg";

function TodoNotes() {
  const [todoItems, setTodoItems] = React.useState([]);
  const [isNew, setNew] = React.useState(false);

  React.useEffect(() => {
    const email = sessionStorage.getItem("user");
    const data = { email: email };
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", `${import.meta.env.VITE_APP_API_BASE_URL}/getTodos`, true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(JSON.stringify(data));
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        var response = this.responseText;
        const responseJSON = JSON.parse(response);
        if (responseJSON.status === "success") {
          delete responseJSON.status;
          delete responseJSON.email;
          delete responseJSON._id;
          console.log(responseJSON);
          // convert object to array
          const arr = Object.keys(responseJSON).map((key) => responseJSON[key]);
          console.log(arr);
          setTodoItems(arr);
        }
      }
    };
  }, []);

  const addItem = () => {
    setTodoItems([...todoItems, { id: todoItems.length + 1, text: `Item ${todoItems.length + 1}`, completed: false }]);
  };

  const removeItem = (id) => {
    setTodoItems(todoItems.filter((item) => item.id !== id));
    const email = sessionStorage.getItem("user");
    const data = { email: email, todo: { id: id } };
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", `${import.meta.env.VITE_APP_API_BASE_URL}/deleteTodo`, true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(JSON.stringify(data));
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        var response = this.responseText;
        const responseJSON = JSON.parse(response);
        if (responseJSON.status === "todo deleted") {
          console.log("deleted");
        }
      }
    };
  };

  const handleItemClick = (index) => {
    setTodoItems(
      todoItems.map((item, i) => {
        if (i === index) {
          if (item.text.startsWith("Item")) {
            setNew(true);
          } else {
            setNew(false);
          }
          return { ...item, editing: true };
        }
        return { ...item, editing: false };
      })
    );
  };

  const handleSave = (index, value) => {
    const email = sessionStorage.getItem("user");
    const doc = {
      email: email,
      todo: todoItems[index],
    };

    // can't save todo as empty
    if (!doc.todo.inputValue) {
      return;
    }

    if (isNew) {
      // add
      const xhttp = new XMLHttpRequest();
      xhttp.open("POST", `${import.meta.env.VITE_APP_API_BASE_URL}/todos`, true);
      xhttp.setRequestHeader("Content-Type", "application/json");
      xhttp.send(JSON.stringify(doc));
    } else if (!isNew) {
      //update
      const xhttp = new XMLHttpRequest();
      xhttp.open("POST", `${import.meta.env.VITE_APP_API_BASE_URL}/updateTodo`, true);
      xhttp.setRequestHeader("Content-Type", "application/json");
      xhttp.send(JSON.stringify(doc));
      console.log("update todo");
    }

    setTodoItems(
      todoItems.map((item, i) => {
        if (i === index) {
          return { ...item, text: item.inputValue, editing: false };
        }
        return item;
      })
    );
  };

  const handleCheckboxChange = (index) => {
    setTodoItems(
      todoItems.map((item, i) => {
        if (i === index) {
          return { ...item, completed: !item.completed };
        }
        return item;
      })
    );
  };
  return (
    <div>
      <button className="add_button" onClick={addItem}>
        Add Note
      </button>
      <div className="sticky_notes_div">
        <div className="todo-div">
          <ul className="bulleted_list">
            {todoItems.map((item, index) => (
              <li className="todo-item" key={item.id}>
                <input className="checkbox" type="checkbox" checked={item.completed} onChange={() => handleCheckboxChange(index)} />
                <img className="trash" src={trash} alt="trash" onClick={() => removeItem(item.id)} />
                {item.editing ? (
                  <input
                    value={item.inputValue}
                    onChange={(event) => {
                      const updatedTodo = todoItems.map((todo, i) => {
                        if (i === index) {
                          return { ...todo, inputValue: event.target.value };
                        }
                        return todo;
                      });
                      setTodoItems(updatedTodo);
                    }}
                    onBlur={(event) => handleSave(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSave(index, event.target.value);
                      }
                    }}
                  />
                ) : (
                  <span className={`todo-text ${item.completed ? "completed" : ""}`} onClick={() => handleItemClick(index)}>
                    {item.text}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TodoNotes;
