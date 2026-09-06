const weatherButton =
    document.getElementById("weatherButton");

const weatherContent =
    document.getElementById("weatherContent");

const apiStatus =
    document.getElementById("apiStatus");

const apiLatency =
    document.getElementById("apiLatency");

const lastChecked =
    document.getElementById("lastChecked");

const refreshButton =
    document.getElementById("refreshButton");


/*
    Update the last checked time
*/
function updateCheckedTime() {

    const now = new Date();

    lastChecked.textContent =
        now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
}


/*
    Check whether the API is working
*/
async function checkApi() {

    const start = performance.now();

    try {

        const response =
            await fetch(
                "/WeatherForecast",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "API returned HTTP " +
                response.status
            );
        }


        const elapsed =
            Math.round(
                performance.now() - start
            );


        apiStatus.textContent =
            "Operational";


        apiLatency.textContent =
            `${elapsed} ms response time`;

    }

    catch (error) {

        apiStatus.textContent =
            "Unavailable";

        apiLatency.textContent =
            "Unable to reach API";
    }


    updateCheckedTime();
}


/*
    Load weather forecast
*/
async function loadWeather() {

    weatherButton.disabled = true;

    weatherButton.textContent =
        "Loading...";


    try {

        const response =
            await fetch(
                "/WeatherForecast",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        weatherContent.innerHTML = `

            <table class="weather-table">

                <thead>

                    <tr>

                        <th>Date</th>

                        <th>Temperature</th>

                        <th>Summary</th>

                    </tr>

                </thead>


                <tbody>

                    ${data.map(item => `

                        <tr>

                            <td>
                                <strong>
                                    ${item.date}
                                </strong>
                            </td>

                            <td>
                                ${item.temperatureC} °C
                            </td>

                            <td>
                                ${item.summary}
                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>
        `;
    }


    catch (error) {

        weatherContent.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ⚠
                </div>

                <h4>
                    Could not load forecast
                </h4>

                <p>
                    ${error.message}
                </p>

            </div>
        `;
    }


    finally {

        weatherButton.disabled = false;

        weatherButton.textContent =
            "Reload Forecast";

        checkApi();
    }
}


/*
    Weather button
*/
weatherButton.addEventListener(
    "click",
    loadWeather
);


/*
    Refresh dashboard
*/
refreshButton.addEventListener(
    "click",
    () => {

        checkApi();

        loadWeather();
    }
);


/*
    Footer year
*/
document.getElementById("year")
    .textContent =
    new Date().getFullYear();


/*
    Initial API health check
*/
checkApi();