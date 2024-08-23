import "./HomePage.css";
import ChartsEmbedSDK from "@mongodb-js/charts-embed-dom";
import { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import LoadingPage from "./LoadingPage";
import TodoNotes from "./TodoNotes";
import MyCalendar from "./MyCalendar";

function HomePage() {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
  const [labels, setLabels] = useState([]);
  const [values, setValues] = useState([]);
  const [income, setIncome] = useState();

  const data = {
    labels: labels,
    datasets: [
      {
        data: values,
        backgroundColor: ["#ff6384", "#32a850", "#a83265", "#080b6e", "#08586e", "#cc5104", "#97cc04", "#cc041b"],
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: "expenses" } },
  };

  // React's useEffect hook runs every time the page loads / refreshes / or if you add some variables in the dependency array which is
  // at the end of the function "[]" the function will re-run every time any of those variables' value changes
  useEffect(() => {
    const email = sessionStorage.getItem("user");
    const data = { email: email };
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", `${import.meta.env.VITE_APP_API_BASE_URL}/getIncome`, true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(JSON.stringify(data));
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        const responseJSON = JSON.parse(this.responseText);
        if (responseJSON.status === "success") {
          setIncome(responseJSON.income);
          const filteredData = Object.entries(responseJSON).filter(([key]) => !["status", "email", "_id", "income"].includes(key));
          setLabels(filteredData.map(([key]) => key));
          setValues(filteredData.map(([_, value]) => value));
        }
      }
    };
  }, []);

  const totalExpenses = values.reduce((a, b) => a + b, 0);

  const getTooltipStyle = () => {
    if (totalExpenses > income) return { backgroundColor: "#cc4227", message: `Oops! Your expenses are exceeding your income by £${totalExpenses - income}!!!` };
    if (totalExpenses < income) return { backgroundColor: "#50d973", message: `Awesome! You saved £${income - totalExpenses}` };
    return { backgroundColor: "#e6e683", message: "Wow! Your expenses are exactly equal to your income this month" };
  };

  const { backgroundColor, message } = getTooltipStyle();

  if (income === undefined) return <LoadingPage />;

  return (
    <div className="overall_parent">
      <div className="home_container">
        <div className="div_chartjs_chart">
          <Bar className="chartjs_chart" options={options} data={data} />
        </div>
        <div className="tooltip_div" style={{ backgroundColor }}>
          <div className="div_header">Tip:</div>
          <div className="div_border"></div>
          <div className="div_text">{message}</div>
        </div>
      </div>
      <div>
        <TodoNotes />
      </div>
      <div>
        <MyCalendar />
      </div>
    </div>
  );
}

export default HomePage;
