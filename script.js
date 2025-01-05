$(document).ready(async () => {

    // Dialog Types
    const dialogTrackedCoinsType = "trackedCoinsType"

    // LiveView Page
    let chart = null
    let intervalID = null
    let inactiveCoins = []

    //Gainers And Losers
    let gainersAndLosersIntervalID = null


    // ------- General Functions -------
    const getThemeName = () => $('html').attr('userTheme')

    const handleDarkToggleButton = () => {
        const currentTheme = getThemeName()

        if (currentTheme === 'dark') {
            $('#toggleDarkModeButton').prop('checked', true)
        } else {
            $('#toggleDarkModeButton').prop('checked', false)
        }
    }


    const applyUserTheme = () => {
        const savedTheme = localStorage.getItem('userTheme')
        const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches

        if (savedTheme) {
            $('html').attr('userTheme', savedTheme)
            handleDarkToggleButton()
        }
        else if (systemDarkMode) {
            $('html').attr('userTheme', 'dark')
        }
        else {
            $('html').attr('userTheme', 'light')
        }
    }

    const checkIfTimePassed = (dateToCheckHolder, minutesToCheck) => {
        //console.log(`Now:${new Date()} Before:${new Date(dateToCheckHolder)}`)
        const differenceInMinutes = (new Date() - new Date(dateToCheckHolder)) / (1000 * 60)
        return differenceInMinutes > minutesToCheck
    }

    const getFormattedDate = (dateHolder) => {
        const date = new Date(dateHolder)

        const month = date.getMonth() + 1
        const day = date.getDate()
        const year = date.getFullYear()

        let hours = date.getHours()
        let minutes = date.getMinutes()
        let seconds = date.getSeconds()

        hours = hours < 10 ? '0' + hours : hours
        minutes = minutes < 10 ? '0' + minutes : minutes
        seconds = seconds < 10 ? '0' + seconds : seconds
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    }

    const getSystemColor = (colorName) => getComputedStyle(document.documentElement).getPropertyValue(colorName)
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
    const scrollToElement = (elemntName) => {
        $(elemntName).get(0).scrollIntoView({ behavior: 'smooth' })
    }


    const showDialog = (title, message, dialogType = `default`) => {

        $('.dialog').remove()

        const dialog = `
        <div class="dialog" style="display:none">
          <div class="dialog-content">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="dialogTrackedCoinsList"></div>
            <button class="closeDialog">Close</button>
          </div>
        </div>
      `
        $('body').append(dialog)

        if (dialogType === dialogTrackedCoinsType) {
            const trackedCoinsList = getTrackedCoinsListFromLocalStorage()
            trackedCoinsList.map((coinObject) => {
                const rowToAdd = `
                    <div class="singleTrackedCoinRow">
                    <h6>${coinObject.name}</h6>
                    <button coinSymbol="${coinObject.symbol}" class="removeTrackedCoinButton">Remove</button>
                    </div>`
                $(`.dialogTrackedCoinsList`).append(rowToAdd)
            })

            //Add Delete all Row
            const rowToAdd = `
            <div class="deleteAllTrackedCoinsRow">
            <div class="singleTrackedCoinRow">
            <button class="deleteAllTrackedCoins">Remove All</button>
            </div>
            </div>`

            $(`.dialogTrackedCoinsList`).append(rowToAdd)

            $(`.removeTrackedCoinButton`).click((event) => {
                const coinToDelete = $(event.target).attr(`coinSymbol`)
                $(`#trackedCoin-${coinToDelete}`).find(`#toggle-${coinToDelete}`).prop('checked', false)
                removeTrackedCoinFromList(coinToDelete)
                $(event.target).siblings(`h6`).parent().fadeOut()
                console.log("Remove coin clicked: ", $(event.target))
                if (getTrackedCoinsListFromLocalStorage().length === 0) {
                    $(`.dialog-content`).find(`h3`).css({ 'text-decoration': 'none', 'margin': '50px 0px', 'white-space': 'nowrap' }).text("Tracked Coins List Is Empty...")
                    $(`.dialog-content`).find(`p`).fadeOut()
                    $(`.deleteAllTrackedCoinsRow`).fadeOut()
                }
            })

            $(`.deleteAllTrackedCoins`).click(() => {
                $(`.toggle-input`).prop('checked', false)
                $(`.tracked-toggle-input`).prop('checked', false)

                $(`.coinLiveViewLastCallsTextValue`).html(`</br>No Data`)
                $(`.statusValue`).text(`Not Active`).css(`color`, `red`)

                const list = getTrackedCoinsListFromLocalStorage()
                console.log("Remove all clicked: ", list)
                $('#removeAllTrackedCoinsContainer').hide()

                // Remove cards on tracked page
                list.map((singleCoin) => {
                    console.log(singleCoin)
                    $(`#trackedCoin-${singleCoin.coinSymbol}`).remove()
                    console.log("removed ", singleCoin.coinSymbol)
                })

                localStorage.removeItem("trackedCoins")


                // Fade Rows
                const rows = $(`.singleTrackedCoinRow`)
                rows.each((index, row) => {
                    console.log(row)
                    $(row).fadeOut(400, function () {
                        $(this).remove()
                    })
                })

                // Apply Empty List Title
                $(`.dialog-content`).find(`h3`).css({ 'text-decoration': 'none', 'margin': '50px 0px', 'white-space': 'nowrap', 'font-size': '20px' }).text("Tracked Coins List Is Empty...")
                $(`.dialog-content`).find(`p`).fadeOut()
                $(`.deleteAllTrackedCoinsRow`).fadeOut()
            })
        }

        $('.dialog').fadeIn()

        $('.closeDialog').click(() => {
            $('.dialog').fadeOut(() => {
                $(this).remove()
            })
        })
    }

    // ------------- LocalStorage -------------
    const getAllCoinsFromLocalStorage = () => JSON.parse(localStorage.getItem('allCoins'))
    const getRecentCoinsListFromLocalStorage = () => JSON.parse(localStorage.getItem('recentCoins'))
    const getTrackedCoinsListFromLocalStorage = () => JSON.parse(localStorage.getItem(`trackedCoins`)) || []
    const getGainersAndLosersFromLocalStorage = () => JSON.parse(localStorage.getItem(`gainersAndLosers`)) || []

    const getCoinFromLocalStorage = (coinSymbol) => {
        const localStorageCoinStats = JSON.parse(localStorage.getItem(`coinsStats`)) || []
        const filteredCoins = localStorageCoinStats.filter(coin => coin.coinData.symbol === coinSymbol)
        if (filteredCoins.length === 0) {
            return null
        } else {
            return filteredCoins
        }
    }

    const saveCoinsListToLocalStorage = (coinsList, coinListType = "all") => {
        const coinsData = {
            data: coinsList,
            lastUpdate: new Date().toISOString()
        }

        console.log(`Saved ${coinsData} list to local storage`)

        switch (coinListType) {
            case "all": {
                localStorage.setItem('allCoins', JSON.stringify(coinsData))
                break
            }
            case "recent": {
                localStorage.setItem('recentCoins', JSON.stringify(coinsData))
                break
            }
            case "gainersAndLosers": {
                localStorage.setItem('gainersAndLosers', JSON.stringify(coinsData))
                break
            }
        }

        console.log("After Save:", getGainersAndLosersFromLocalStorage())

    }

    const saveCoinData = (coinData) => {
        const localStorageCoinStats = JSON.parse(localStorage.getItem(`coinsStats`)) || []
        const coinStats = {
            coinData,
            lastUpdated: new Date()
        }
        const updatedCoins = localStorageCoinStats.filter((coin) => coin.coinData.symbol !== coinData.symbol)
        updatedCoins.push(coinStats)
        localStorage.setItem('coinsStats', JSON.stringify(updatedCoins))
        //console.log("Updated Local Storage:", updatedCoins)
    }

    // ------ API ------
    const getAllCoins = async () => {
        try {
            let allCoins = getAllCoinsFromLocalStorage() || []
            const allCoinsObject = allCoins.data
            const lastUpdate = new Date(allCoins.lastUpdate)

            if (!allCoinsObject || checkIfTimePassed(lastUpdate, 2)) {
                console.log("Getting All coins from API...")
                const options = {
                    method: 'GET',
                    url: 'https://api.coingecko.com/api/v3/coins/markets',
                    data: {
                        vs_currency: 'usd', // Specify query parameters if required
                        order: 'market_cap_desc',
                        per_page: 100,
                        page: 1
                    }
                }
                allCoins = await $.ajax(options)
                //allCoins.splice(0, allCoins.length - 100)
                saveCoinsListToLocalStorage(allCoins, "all")
                //console.log(`Getting coins from API:`, allCoins)

            } else {
                allCoins = allCoinsObject
                console.log(`Getting All coins from LOCAL, Last Update:`, new Date(lastUpdate).toLocaleTimeString())
            }

            return allCoins
        } catch (err) {
            throw new Error(`Error fetching API ${err}`)
        }
    }

    const getAllRecentCoins = async () => {
        try {
            let recentCoins = getRecentCoinsListFromLocalStorage() || []
            const recentCoinsObject = recentCoins.data
            const lastUpdate = new Date(recentCoins.lastUpdate)

            if (!recentCoinsObject || checkIfTimePassed(lastUpdate, 2)) {
                console.log("Getting recent coins from API...")
                const allRecentCoins = await $.ajax(`https://api.coingecko.com/api/v3/coins/list`)
                recentCoins = allRecentCoins.slice(0, 100)
                saveCoinsListToLocalStorage(recentCoins, "recent")
            } else {
                console.log(`Getting recent coins from LOCAL, Last Update:`, new Date(lastUpdate).toLocaleTimeString())
                return recentCoinsObject
            }

            console.log("Recent Coins:", { recentCoins })
            return recentCoins
        } catch (err) {
            throw new Error(`Error fetching API`, err)
        }
    }

    const getAllGainersAndLosers = async () => {
        try {
            let gainersCoins = getGainersAndLosersFromLocalStorage()
            const gainersCoinsObject = gainersCoins.data
            const lastUpdate = new Date(gainersCoins.lastUpdate)

            if (!gainersCoinsObject || checkIfTimePassed(lastUpdate, 2)) {
                console.log("Getting Gainers coins from API...")
                let gainersList = await $.ajax(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd`)
                const topGainers = gainersList.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 10)
                const topLosers = gainersList.sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 10)
                const dataObj = {
                    topGainers,
                    topLosers,
                }
                saveCoinsListToLocalStorage(dataObj, "gainersAndLosers")
            } else {
                console.log(`Getting gainers coins from LOCAL, Last Update:`, new Date(lastUpdate).toLocaleTimeString())
                return gainersCoins
            }

            return getGainersAndLosersFromLocalStorage()
        } catch (err) {
            throw new Error(`Error fetching Gainers API`, err)
        }
    }

    const getCoinDetails = async (coinID) => {
        try {
            console.log(coinID)
            const settings = {
                async: true,
                crossDomain: true,
                url: `https://api.coingecko.com/api/v3/coins/${coinID}`,
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': 'CG-gg5FBBQkUr31RHVSvujvm55x'
                }
            }

            const coinDetails = await $.ajax(settings)
            saveCoinsListToLocalStorage(allCoins)
            return coinDetails
        } catch (err) {
            throw new Error(`Error fetching coin details`)
        }
    }

    // Prints
    const isCoinTracked = (coinSymbol) => {
        const trackedCoinsList = getTrackedCoinsListFromLocalStorage()
        return trackedCoinsList.some(coin => coin.symbol === coinSymbol)
    }

    const printSingleCoin = (coin) => {
        let html = `
        <div class="coinCardWithToggleButton" id="${coin.symbol}">
        <div class="toggle-switch">
        <input type="checkbox" id="toggle-${coin.symbol}" ${isCoinTracked(coin.symbol) ? "checked" : ""} class="toggle-input" toggleID="${coin.symbol}" toggleName="${coin.name}">
        <label for="toggle-${coin.symbol}" class="toggle-label"></label>
        </div>
        <div class="coinCard" >
        <h4>${coin.name}</h4>
        <div style="display:none" class="coinCardDetails"></div>
        <div style="display:none" class="loader"></div>
        <button class="detailsButton" coinID="${coin.id}" coinName="${coin.name}" coinSymbol="${coin.symbol}">More Details</button>
        </div>
        </div>
        `
        $(`.allCoinsDiv`).append(html)
    }

    const printCoinsToDom = async (allCoins) => {
        $(`.allCoinsDiv`).empty()
        $(`.page.homePage .loader`).hide()

        allCoins.map((coin) => {
            printSingleCoin(coin)
        })

        // Card Events
        $(`.detailsButton`).click((event) => {
            if ($(event.target).text() === "Hide") {
                hideCoinDetails(event.target)
                console.log("Need To Close")
            } else {
                showCoinDetails(event.target)
            }
        })

        $(`.toggle-input`).change((event) => {

            const isChecked = $(event.target).prop('checked')
            const symbol = $(event.target).attr("toggleID")
            const name = $(event.target).attr("toggleName")

            if (isTrackedCoinsListIsFull() && isChecked) {
                $(event.target).prop('checked', false)
                return showDialog("Limit Reached", "You can track only 5 coins at a time, please uncheck a coin to add a new one.", dialogTrackedCoinsType)
            }

            if (isChecked) {
                $(event.target).prop('checked', true)
                $(`#tracked-toggle-${symbol}`).prop('checked', true)
                addTrackCoinToList(name, symbol)

            } else {
                $(event.target).prop('checked', false)
                $(`#tracked-toggle-${symbol}`).prop('checked', false)
                removeTrackedCoinFromList(symbol)
            }

            console.log("New Tracked List:", JSON.parse(localStorage.getItem(`trackedCoins`)))
        })
    }

    const hideCoinDetails = (moreInfoButton) => {
        $(moreInfoButton).parent().parent().toggleClass(`hidden`)
        $(moreInfoButton).parent().find(`.coinImage`).remove()
        $(moreInfoButton).siblings(`.coinCardDetails`).hide(`slow`)
        $(moreInfoButton).text(`More Details`)
    }

    const showCoinDetails = async (moreInfoButton) => {
        const coinid = $(moreInfoButton).attr(`coinid`)
        const coinSymbol = $(moreInfoButton).attr(`coinSymbol`)

        $(moreInfoButton).parent().parent().toggleClass(`showing`)

        //Show Loader
        $(moreInfoButton).siblings(`.loader`).show(`fast`)
        $(moreInfoButton).hide(`fast`)


        const coinDetailsFromLocal = getCoinFromLocalStorage(coinSymbol)
        let coinDetails
        if (coinDetailsFromLocal) {
            coinDetails = coinDetailsFromLocal[0].coinData
            const lastUpdated = coinDetailsFromLocal[0].lastUpdated
            console.log(`Coin Exist In Local`, coinDetails)

            if (checkIfTimePassed(lastUpdated, 2)) {
                console.log("2 Minutes Passed,getting from API...Last Update:", new Date(lastUpdated))
                coinDetails = await getCoinDetails(coinid)
                saveCoinData(coinDetails)
            } else {
                console.log(`2 Minutes DIDNT Passed, Getting from LOCAL... Last update:`, new Date(lastUpdated))
            }
        } else {
            coinDetails = await getCoinDetails(coinid)
            saveCoinData(coinDetails)
            console.log("Coin Not Exist In Local.. Saving it...")
        }

        // Print Coin Details:
        const image = coinDetails.image.small
        //Display image above title
        $(moreInfoButton).parent().find(`.coinImage`).remove()
        $(moreInfoButton).parent().prepend(`<img class="coinImage" src="${image}"></img>`)

        const html = `
        <h6>Euro: .......... ${coinDetails.market_data.current_price.eur ? coinDetails.market_data.current_price.eur + `€` : "Not Exist"}</h6>
        <h6>USD: .......... ${coinDetails.market_data.current_price.usd ? coinDetails.market_data.current_price.usd + `$` : "Not Exist"}</h6>
        <h6>ILS: .......... ${coinDetails.market_data.current_price.ils ? coinDetails.market_data.current_price.ils + `₪` : "Not Exist"}</h6>
        `

        //Display details under title
        $(moreInfoButton).siblings(`.coinCardDetails`).html(``)
        $(moreInfoButton).siblings(`.coinCardDetails`).append(html)
        $(moreInfoButton).siblings(`.coinCardDetails`).show(`slow`)
        $(moreInfoButton).text(`Hide`)
        $(moreInfoButton).show(`fast`)
        $(moreInfoButton).siblings(`.loader`).hide(`fast`)

    }

    function getColorFromIndex(index) {
        const colors = [
            "#FF1700",
            "#4169E1",
            "#32CD32",
            "#FFD700",
            "#8A2BE2",
        ]
        return colors[index]
    }

    const handleEmptyTrackedCoinsOnLiveReports = () => {
        const trackedCoinsLength = getTrackedCoinsListFromLocalStorage().length | 0
        const allTrackedCoinsOnDom = $(`#trackedCoinsDisplay`).children(".coinCardWithToggleButton")

        if (trackedCoinsLength === 0) {
            if (allTrackedCoinsOnDom.length === 0) {
                stopChart()
            }

            $('#chartContainer').hide()
            $(`#trackedCoinsEmptyListTitle`).text(`Please track a coin in order to display the chart`)
            $(`#trackedCoinsEmptyListTitle`).show('slow')
            $('#reportsPageLoader').hide()
        } else {
            $(`#trackedCoinsContainer`).show()
            $('#trackedCoinsEmptyListTitle').hide('slow')
            setTimeout(() => {
                if (!$(`#chartContainer`).is(":visible") || allTrackedCoinsOnDom.length > 0) {
                    $('#reportsPageLoader').show()
                } else {
                    $('#reportsPageLoader').hide()
                }
            }, 100)
        }
    }

    const getAllTrackedCoinsPrice = async () => {
        const trackedCoins = getTrackedCoinsListFromLocalStorage() || []
        const coinNames = trackedCoins.map((coin) => coin.symbol?.replace(` `, ``) || "").join(",")
        const allTrackedCoinsStats = await $.ajax(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${coinNames}&tsyms=USD`)
        return allTrackedCoinsStats
    }

    const isTrackedCoinsListIsFull = () => {
        const trackedCoinsList = getTrackedCoinsListFromLocalStorage()
        return trackedCoinsList.length === 5
    }

    const removeTrackedCoinFromList = (coinSymbol) => {
        console.log("Coin To Delete:", coinSymbol)

        const trackedCoinsList = getTrackedCoinsListFromLocalStorage()
        const filteredList = trackedCoinsList.filter(coin => coin.symbol !== coinSymbol)
        localStorage.setItem('trackedCoins', JSON.stringify(filteredList))

        $(`#tracked-toggle-${coinSymbol}`).prop('checked', false)
        $(`#removeButton-${coinSymbol}`).show()
    }

    const addTrackCoinToList = (name, symbol) => {
        const trackedCoinsList = getTrackedCoinsListFromLocalStorage()
        const coinObject = {
            name,
            symbol
        }
        trackedCoinsList.push(coinObject)
        localStorage.setItem('trackedCoins', JSON.stringify(trackedCoinsList))
        $(`#removeButton-${symbol}`).hide()
    }

    // LiveView 
    const startChart = async () => {
        const updateAfter = 2
        const maxTimeFrames = 3
        const timeWindow = maxTimeFrames * updateAfter

        // Calculate fixed ranges for x-axis
        let endTime = Math.ceil(Date.now() / 1000) * 1000
        let startTime = endTime - (timeWindow * 1000)


        if (!localStorage.getItem('trackedCoins')) {
            localStorage.setItem('trackedCoins', JSON.stringify([]))
        }

        const trackedCoinsData = await getAllTrackedCoinsPrice()
        const trackedCoinsStartUpList = getTrackedCoinsListFromLocalStorage()

        handleEmptyTrackedCoinsOnLiveReports()

        // Fetch initial tracked coins data
        const data = Object.keys(trackedCoinsData).map((coinKey, index) => {
            const coinPrice = trackedCoinsData[coinKey]
            return {
                type: "line",
                name: coinKey,
                showInLegend: true,
                thickness: 4,
                toolTipContent: "Coin: {name}<br/><br/>Price: ${y}<br/><br/>Time: {formattedTime}",
                index: index,
                color: getColorFromIndex(index),
                dataPoints: [{
                    x: new Date(startTime),
                    y: coinPrice.USD,
                    formattedTime: new Date(startTime).toLocaleTimeString("en-US", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    }),
                }]
            }
        })

        console.log("Background", getSystemColor(`--background-color`))

        const options = {
            backgroundColor: getSystemColor(`--background-color`),
            responsive: true,
            exportEnabled: true,
            animationEnabled: true,
            title: {
                text: "Tracked Coins Price",
                fontColor: getSystemColor(`--text-color`)
            },
            axisX: {
                title: "Time Frame",
                titleFontColor: getSystemColor(`--text-color`),
                labelFontColor: getSystemColor(`--text-color`),
                valueFormatString: "HH:mm:ss",
                interval: updateAfter,
                intervalType: "second",
                stripLines: [{
                    value: startTime,
                    thickness: 4
                }],
                minimum: new Date(startTime),
                maximum: new Date(endTime)
            },
            axisY: {
                title: "Coin Price",
                titleFontColor: getSystemColor(`--text-color`),
                labelFontColor: getSystemColor(`--text-color`),
                prefix: "$",
                includeZero: false,
                logarithmic: true,
            },
            legend: {
                fontColor: getSystemColor(`--text-color`),
                cursor: "pointer",
                itemclick: function (e) {
                    if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                        e.dataSeries.visible = false
                    } else {
                        e.dataSeries.visible = true
                    }
                    chart.render()
                }
            },
            data: data
        }

        chart = new CanvasJS.Chart("chartContainer", options)
        chart.render()

        let firstStart = true
        const updateChart = async () => {
            console.log("Updating chart...")

            if (firstStart) {
                $('#reportsPageLoader').hide()
                scrollToElement(`#trackedCoinsContainer`)
                firstStart = false
            }

            const trackedCoinsList = getTrackedCoinsListFromLocalStorage()
            const updatedCoinsData = await getAllTrackedCoinsPrice()

            const trackedCoinsContainer = $("#trackedCoinsDisplay")
            const allTrackedCoinsOnDom = trackedCoinsContainer.children(".coinCardWithToggleButton")

            const currentSecond = Math.floor(Date.now() / 1000)
            const alignedSecond = currentSecond - (currentSecond % updateAfter)
            const alignedTime = alignedSecond * 1000
            const currentTime = new Date(endTime)

            let isChartVisible = $('#chartContainer').is(':visible')

            inactiveCoins = []
            let activeCoins = []

            if (trackedCoinsList.length === 0) {
                handleEmptyTrackedCoinsOnLiveReports()

                allTrackedCoinsOnDom.each(function (index, element) {
                    const toggleName = $(this).find(".tracked-toggle-input").attr("toggleName")
                    const toggleID = $(this).find(".tracked-toggle-input").attr("toggleID")

                    if (!updatedCoinsData[toggleName]) {
                        $(`#loader-${toggleID}`).hide("fast")
                        $(`#statusValue-${toggleID}`).text(`Not Active`).css("color", "red")
                        inactiveCoins.push($(this))
                    } else {
                        $(`#statusValue-${toggleID}`).text(`Active`).css("color", "green")
                        activeCoins.push($(this))
                    }

                })

                // console.log("updatedCoinsData:", updatedCoinsData)
                // console.log("Tracked Coins List:", trackedCoinsList)
                // console.log("Active Coins:", activeCoins)
                // console.log("Inactive Coins:", inactiveCoins)

                return
            }

            // Update the fixed time window
            endTime = alignedTime + (updateAfter * 1000)
            startTime = endTime - (timeWindow * 1000)


            //Updates coin data on card
            allTrackedCoinsOnDom.each(function (index, element) {
                const toggleName = $(this).find(".tracked-toggle-input").attr("toggleName")
                const toggleID = $(this).find(".tracked-toggle-input").attr("toggleID")
                const symbol = toggleID.toLocaleUpperCase()
                const detailsContainer = $(`#coinLiveViewDetails-${toggleID}`)
                const lastPrice = $(`#coinLiveViewPrice-${toggleID}`)
                const lastUpdate = $(`#coinLiveViewTime-${toggleID}`)
                const lastCalls = $(`#coinLastCalls-${toggleID}`)

                let coinInStaticsList = trackedCoinsStartUpList.find(item => item.name === toggleName)

                // console.log("Stats:", coinInStaticsList)
                // console.log("Full List:", updatedCoinsData)
                // console.log("Name:", toggleID)
                // console.log("is Coin Exist?", updatedCoinsData[toggleName])
                // console.log(`is Coin Have Data? ${updatedCoinsData[toggleName]}`)
                // console.log("is Coin Have Updated Data?", updatedCoinsData)

                if (!updatedCoinsData[symbol] || !updatedCoinsData[symbol].USD || !updatedCoinsData) {
                    $(`#loader-${toggleID}`).hide("fast")
                    $(`#statusValue-${toggleID}`).text(`Not Active`).css("color", "red")
                    inactiveCoins.push($(this))
                } else {
                    $(`#statusValue-${toggleID}`).text(`Active`).css("color", "green")

                    const hours = String(currentTime.getHours()).padStart(2, '0')
                    const minutes = String(currentTime.getMinutes()).padStart(2, '0')
                    const seconds = String(currentTime.getSeconds()).padStart(2, '0')
                    const timeString = `${hours}:${minutes}:${seconds}`
                    lastUpdate.text(timeString)
                    lastPrice.text(`$` + updatedCoinsData[symbol].USD)
                    // console.log("Total :", coinInStaticsList)

                    // Last Calls Update
                    if (coinInStaticsList) {
                        if (!coinInStaticsList.lastCalls) {
                            coinInStaticsList.lastCalls = []
                        }

                        if (coinInStaticsList.lastCalls.length === 4) {
                            coinInStaticsList.lastCalls.shift()
                        }

                        const obj = {
                            time: timeString,
                            price: updatedCoinsData[symbol].USD
                        }
                        coinInStaticsList.lastCalls.push(obj)

                        if (coinInStaticsList.lastCalls.length > 0) {

                            const firstPrice = coinInStaticsList.lastCalls[0]?.price || null
                            const secondPrice = coinInStaticsList.lastCalls[1]?.price || null
                            const thirdPrice = coinInStaticsList.lastCalls[2]?.price || null
                            const fourthPrice = coinInStaticsList.lastCalls[3]?.price || null

                            let firstToSecondPercentage = null
                            let firstToSecondColor = ''
                            if (firstPrice !== null && secondPrice !== null) {
                                firstToSecondPercentage = ((secondPrice - firstPrice) / firstPrice) * 100
                                // console.log(`Percentage change from first to second: ${firstToSecondPercentage.toFixed(2)}%`)
                                if (firstToSecondPercentage > 0) {
                                    firstToSecondColor = 'green'
                                } else if (firstToSecondPercentage < 0) {
                                    firstToSecondColor = 'red'
                                } else {
                                    firstToSecondColor = getSystemColor(`--text-color`)
                                }
                            }

                            let secondToThirdPercentage = null
                            let secondToThirdColor = ''
                            if (secondPrice !== null && thirdPrice !== null) {
                                secondToThirdPercentage = ((thirdPrice - secondPrice) / secondPrice) * 100
                                // console.log(`Percentage change from second to third: ${secondToThirdPercentage.toFixed(2)}%`)
                                if (secondToThirdPercentage > 0) {
                                    secondToThirdColor = 'green'
                                } else if (secondToThirdPercentage < 0) {
                                    secondToThirdColor = 'red'
                                } else {
                                    secondToThirdColor = getSystemColor(`--text-color`)
                                }
                            }

                            let thirdToFourthPercentage = null
                            let thirdToFourthColor = ''
                            if (thirdPrice !== null && fourthPrice !== null) {
                                thirdToFourthPercentage = ((fourthPrice - thirdPrice) / thirdPrice) * 100
                                // console.log(`Percentage change from second to third: ${thirdToFourthPercentage.toFixed(2)}%`)
                                if (thirdToFourthPercentage > 0) {
                                    thirdToFourthColor = 'green'
                                } else if (thirdToFourthPercentage < 0) {
                                    thirdToFourthColor = 'red'
                                } else {
                                    thirdToFourthColor = getSystemColor(`--text-color`)
                                }
                            }

                            if (lastCalls.children().length >= 3) {
                                lastCalls.children().first().remove()
                            }

                            let percentageChangeText = ''
                            let percentageColor = ''
                            if (coinInStaticsList.lastCalls.length === 1) {
                                percentageChangeText = 'No data'
                            } else if (coinInStaticsList.lastCalls.length === 2) {
                                percentageChangeText = `${firstToSecondPercentage.toFixed(3)}%`
                                percentageColor = firstToSecondColor
                            } else if (coinInStaticsList.lastCalls.length === 3) {
                                percentageChangeText = `${secondToThirdPercentage.toFixed(3)}%`
                                percentageColor = secondToThirdColor
                            } else if (coinInStaticsList.lastCalls.length === 4) {
                                percentageChangeText = `${thirdToFourthPercentage.toFixed(3)}%`
                                percentageColor = thirdToFourthColor
                            }

                            lastCalls.append(`
                                <p style="color: ${percentageColor}">${obj.time} | $${obj.price} | ${percentageChangeText}</p>
                            `)
                        }
                    } else {
                        // console.log(`Coin with name ${toggleName} not found`)
                    }

                    detailsContainer.show("fast")
                    activeCoins.push($(this))
                }

                $(`#loader-${toggleID}`).hide("fast")
            })

            // console.log("updatedCoinsData:", updatedCoinsData)
            // console.log("Tracked Coins List:", trackedCoinsList)
            // console.log("Active Coins:", activeCoins.length)
            // console.log("Inactive Coins:", inactiveCoins)

            if (activeCoins.length > 0) {
                if (!isChartVisible) {
                    $('#chartContainer').show()
                    $('#trackedCoinsEmptyListTitle').hide()
                    $('#reportsPageLoader').hide()
                    isChartVisible = true
                }
            }

            if (inactiveCoins.length > 1 || activeCoins.length > 1 || $('#trackedCoinsDisplay').children().length > 1) {
                $('#removeAllTrackedCoinsButton').show()
            } else {
                $('#removeAllTrackedCoinsButton').hide()
            }

            $('#trackedCoinsDisplay').empty()
            $('#trackedCoinsDisplay').append(activeCoins)
            $('#trackedCoinsDisplay').append(inactiveCoins)


            $(`.tracked-toggle-input`).change((event) => {
                const isChecked = $(event.target).prop('checked')
                const symbol = $(event.target).attr("toggleID")
                const name = $(event.target).attr("toggleName")

                if (isChecked) {
                    addTrackCoinToList(name, symbol)
                    $(event.target).prop('checked', true)
                } else {
                    $(event.target).prop('checked', false)
                    removeTrackedCoinFromList(symbol)
                }
            })

            // Update axis range to maintain fixed position
            chart.options.axisX.minimum = new Date(startTime)
            chart.options.axisX.maximum = new Date(endTime)

            options.data.forEach(series => {
                const coinKey = series.name
                const coinPrice = updatedCoinsData[coinKey]

                if (coinPrice) {
                    // Add new data point
                    series.dataPoints.push({
                        x: new Date(alignedTime),
                        y: coinPrice.USD,
                        formattedTime: new Date(alignedTime).toLocaleTimeString("en-US", {
                            hour12: false,
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })
                    })
                }

                if (!updatedCoinsData[coinKey]) {
                    series.showInLegend = false
                } else {
                    series.showInLegend = true
                    series.color = getColorFromIndex(series.index)
                    const symbol = trackedCoinsList.filter((coin) => coin.symbol?.toLocaleLowerCase() === coinKey.toLocaleLowerCase())[0]?.symbol || ""
                    $(`#trackedCoin-${symbol}`).css("box-shadow", `0px 0px 5px 1px ${getColorFromIndex(series.index)}`)
                }
            })

            chart.render()
        }
        intervalID = setInterval(updateChart, updateAfter * 1000)
    }

    const stopChart = () => {
        if (intervalID) {
            clearInterval(intervalID)
            intervalID = null
            $(`#chartContainer`).hide()
            console.log("Chart updates stopped.")
        }
    }


    const addTrackedCoinInTrackCoinsPage = (coin) => {
        console.log("Coin Added  To Tracked Dom:", coin)

        if ($(`#trackedCoin-${coin.symbol}`).length > 0) {
            $(`#removeButton-${coin.symbol}`).hide()
            return
        }

        let html = `
        <div class="coinCardWithToggleButton" id="trackedCoin-${coin.symbol}">
        <div class="trackedCoinsTopContainer">
        <button id="removeButton-${coin.symbol}" style="display:none">Remove Coin</button>
        <div class="toggle-switch">
        <input type="checkbox" id="tracked-toggle-${coin.symbol}" ${isCoinTracked(coin.symbol) ? "checked" : ""} class="tracked-toggle-input" toggleID="${coin.symbol}" toggleName="${coin.name}">
        <label for="tracked-toggle-${coin.symbol}" class="toggle-label"></label>
        </div>
        </div>
        <div coinSymbol="${coin.symbol}" class="coinCard">
        <h4>${coin.name}</h4>
        <h6>${coin.symbol.toLocaleUpperCase()}</h6>
        <div style="display:none" class="coinCardDetails"></div>
        <div class="coinStatusContainer"> 
        <p class="coinStatus" id="coinStatus-${coin.symbol}"> <span class="statusTitle">Status:</span> <span class="statusValue" id="statusValue-${coin.symbol}"><div id="loader-${coin.symbol}" class="loader" style="width: 25px height: 25px"></div></span></p>        
        </div>
        <div id="coinLiveViewDetails-${coin.symbol}" class="coinLiveViewDetails" style="display:none">
        <p><span class="coinLiveViewTextTitle">Last Update:</span><span class="coinLiveViewTextValue" id="coinLiveViewTime-${coin.symbol}">Loading...</span></p>
        <p><span class="coinLiveViewTextTitle">Last Price:</span><span class="coinLiveViewTextValue" id="coinLiveViewPrice-${coin.symbol}">Loading...</span></p>
        <p><span class="coinLiveViewTextTitle">Last Calls:</span><span class="coinLiveViewLastCallsTextValue" id="coinLastCalls-${coin.symbol}"></br></br></span></p>
        </div>
        </div>
        </div>
        `
        $(`#trackedCoinsDisplay`).append(html)
        $(`#statusValue-${coin.symbol}`).css("color", isCoinTracked(coin.symbol) ? "green" : "red")
        $(`#statusValue-${coin.symbol}`).css("display", `inline-block`)

        $(`#trackedCoinsDisplay`).on('click', `#removeButton-${coin.symbol}`, () => {
            console.log("Delete Clciked")
            $('#trackedCoinsDisplay').find(`#tracked-toggle-${coin.symbol}`).closest('.coinCardWithToggleButton').fadeOut(300, function () {
                $(this).remove()
            })
        })
    }

    const fillTrackedCoinsList = () => {
        $('#trackedCoinsDisplay').empty()
        const trackedCoins = getTrackedCoinsListFromLocalStorage()
        trackedCoins.map((coin) => {
            addTrackedCoinInTrackCoinsPage(coin)
        })

        $(`.tracked-toggle-input`).change((event) => {
            const isChecked = $(event.target).prop('checked')
            const symbol = $(event.target).attr("toggleID")
            const name = $(event.target).attr("toggleName")
            console.log("SPECIAL")

            if (isChecked) {
                addTrackCoinToList(name, symbol)
                $(event.target).prop('checked', true)
            } else {
                $(event.target).prop('checked', false)
                removeTrackedCoinFromList(symbol)
            }
        })
    }

    const printGainersTable = (gainersList, tableTypeName, lastUpdated) => {

        const trackedCoinsList = getTrackedCoinsListFromLocalStorage()
        let bodyName
        let tableTitle

        switch (tableTypeName) {
            case "topGainers": {
                bodyName = "topGainersBody"
                tableTitle = `<p>${lastUpdated}</p><h3>Top Gainers</h3>`
                break
            }
            case "topLosers": {
                bodyName = "topLosersBody"
                tableTitle = `<p>${lastUpdated}</p><h3>Top Losers</h3>`
                break
            }
        }

        const html = `
            <div class="col-12 col-xl-6 mb-4">
            <div class="table-responsive">
            <table class="myTableStyle">
            <thead>
            <tr>
            <th colspan="6">${tableTitle}</th>
            </tr>
            <tr>
            <th></th>
            <th>Name:</th>
            <th>Price:</th>
            <th>Volume:</th>
            <th>24h:</th>
            <th></th>
            </tr>
            </thead>
            <tbody id="${bodyName}">
            ${gainersList.map((coin) => {

            const filteredTrackedCoins = trackedCoinsList.filter((trackedCoin) =>
                trackedCoin.symbol === coin.symbol
            )

            const isExist = filteredTrackedCoins.length > 0
            const percentageChange = coin.price_change_percentage_24h
            const percentageMessage = percentageChange > 0 ?
                `+${percentageChange.toFixed(2)}%` :
                `${percentageChange.toFixed(2)}%`
            const percentageColor = percentageChange > 0 ?
                `green` : (percentageChange < 0 ? `red` : `gray`)

            const formattedVolume = `$${coin.total_volume.toLocaleString('en-US')}`
            return `
                    <tr class="gainersLosersTableRow">
                    <td><img width="20px" height="20px" src="${coin.image}"/></td>
                    <td>${coin.name}</td>
                    <td>$${coin.current_price}</td>
                    <td>${formattedVolume}</td>
                    <td style="color:${percentageColor}">${percentageMessage}</td>
                    <td class="gainerCoinTrackButtonContainer">
                    <button class="gainerCoinTrackButton ${isExist ? "tracked" : ""}" 
                    name="${coin.name}" 
                    symbol="${coin.symbol}" 
                    id="gainerCoinTrackButton-${coin.name}">
                    ${isExist ? "Untrack" : "Track"}
                    </button>
                    </td>
                    </tr>`}).join('')}
                    </tbody>
                    </table>
                    </div>
                    </div>
                    `

        $(`.gainersContainer`).append(html)
    }

    const printTopGainersAndLosers = (topGainers, topLosers, lastUpdated) => {

        // console.log(`printTopGainersAndLosers ${{ topGainers, topLosers, lastUpdated }}`)

        $(`.gainersContainer`).empty()
        printGainersTable(topGainers, "topGainers", lastUpdated)
        printGainersTable(topLosers, "topLosers", lastUpdated)

        $(`.gainerCoinTrackButton`).click((event) => {

            const isExist = $(event.target).hasClass(`tracked`)
            const trackedList = getTrackedCoinsListFromLocalStorage()

            const name = $(event.target).attr(`name`)
            const symbol = $(event.target).attr(`symbol`)

            if (isExist) {
                $(event.target).removeClass(`tracked`)
                $(event.target).text(`Track`)

                const filteredList = trackedList.filter((coin) => coin.symbol !== symbol)
                localStorage.setItem('trackedCoins', JSON.stringify(filteredList))
                // console.log("Fitlered:", filteredList)
            } else {

                if (isTrackedCoinsListIsFull()) {
                    $(event.target).prop('checked', false)
                    return showDialog("Limit Reached", "You can track only 5 coins at a time, please uncheck a coin to add a new one.", dialogTrackedCoinsType)
                }

                $(event.target).text(`Untrack`)
                $(event.target).addClass(`tracked`)

                const coinObject = {
                    name,
                    symbol
                }

                trackedList.push(coinObject)
                // console.log("new List:", trackedList)
                localStorage.setItem('trackedCoins', JSON.stringify(trackedList))
            }

        })
    }

    const stopGainersAndLosersUpdates = () => {
        if (gainersAndLosersIntervalID) {
            clearInterval(gainersAndLosersIntervalID)
            gainersAndLosersIntervalID = null
            console.log("Gainers And Losers updates stopped.")
        }
    }

    const showGainersContainer = () => {
        $('.gainersContainer').removeClass('d-none').addClass('d-flex')
        $('.searchCoinDiv').removeClass('d-flex').addClass('d-none')
    }

    const hideGainersContainer = () => {
        stopGainersAndLosersUpdates()
        $('.gainersContainer').removeClass('d-flex').addClass('d-none')
        $('.searchCoinDiv').removeClass('d-none').addClass('d-flex')
    }

    const updateGainersAndLosers = async () => {
        console.log("Gainers And Losers Updated...")
        const gainersAndLosersList = await getAllGainersAndLosers()
        const topGainers = gainersAndLosersList.data.topGainers
        const topLosers = gainersAndLosersList.data.topLosers
        const lastUpdate = getFormattedDate(new Date(gainersAndLosersList.lastUpdate))
        printTopGainersAndLosers(topGainers, topLosers, lastUpdate)
    }

    const applySelectedSortOption = async (selectedSort) => {
        $(`#clearSortButton`).show()

        if (selectedSort !== "topGainersAndLosers") {
            hideGainersContainer()
        } else {
            showGainersContainer()
        }

        switch (selectedSort) {
            case `default`: {
                const allCoins = await getAllCoins()
                if (allCoins.length === 0) {
                    $(`.allCoinsDiv`).empty()
                    $(`#searchNoResultsTitle`).show()
                } else {
                    printCoinsToDom(allCoins)
                    $(`#searchNoResultsTitle`).hide()
                }
                break
            }
            case `tracked`: {
                if (getTrackedCoinsListFromLocalStorage().length === 0) {
                    $(`.allCoinsDiv`).empty()
                    $(`#searchNoResultsTitle`).show()
                } else {
                    printCoinsToDom(getTrackedCoinsListFromLocalStorage())
                    $(`#searchNoResultsTitle`).hide()
                }
                break
            }
            case `recentCoins`: {
                const recentCoins = await getAllRecentCoins()
                if (recentCoins.length === 0) {
                    $(`.allCoinsDiv`).empty()
                    $(`#searchNoResultsTitle`).show()
                } else {
                    printCoinsToDom(recentCoins)
                    $(`#searchNoResultsTitle`).hide()
                }
                break
            }
            case `topGainersAndLosers`: {
                $(`.allCoinsDiv`).empty()
                $(`.page.homePage .loader`).fadeIn()

                const gainersAndLosersList = await getAllGainersAndLosers()
                console.log("GainersList", { gainersAndLosersList })

                if (gainersAndLosersList.length === 0) {
                    $(`#searchNoResultsTitle`).show()
                } else {
                    $(`.page.homePage .loader`).hide()
                    updateGainersAndLosers()
                    scrollToElement(".gainersContainer")
                    const updateAfter = 2
                    gainersAndLosersIntervalID = setInterval(() => updateGainersAndLosers(), 1000 * 60 * updateAfter)
                    $(`#searchNoResultsTitle`).hide()
                }
                break
            }
        }
    }


    const resetSortAndSearch = async () => {
        //location.reload()

        // Search Reset
        $('#coinSearchInput').val('')
        $(`#resetSearchButton`).hide()

        // Sort Reset
        $(`#clearSortButton`).hide()
        $('#sortBySelectedOption').prop('selectedIndex', 0)

        // Empty text 
        $(`#searchNoResultsTitle`).hide()

        const allCoins = await getAllCoins()
        printCoinsToDom(allCoins)
    }


    // Events
    const setEvents = () => {

        //Navigator
        $(".navLink").click((event) => {
            event.preventDefault()

            const clickedPageName = $(event.target).attr("pageName")
            if ($(event.target).hasClass("selected")) {
                // console.log(`Already on the ${clickedPageName} page`)
                return
            }

            $(".navLink").removeClass("selected")
            $(event.target).addClass("selected")

            $(".page").hide("fast")
            $(`.page.${clickedPageName}`).show("fast")

            if (clickedPageName === "reportsPage") {
                // console.log("In Report page")

                fillTrackedCoinsList()
                const tracked = getTrackedCoinsListFromLocalStorage()
                const trackedCoinsOnDom = $("#trackedCoinsContainer").children(".coinCardWithToggleButton")
                // console.log(tracked, trackedCoinsOnDom.length)

                if (tracked.length > 0 || trackedCoinsOnDom.length > 0) {
                    startChart()
                } else {
                    $("#chartContainer").hide()
                    $("#trackedCoinsEmptyListTitle").text("Please track a coin in order to display the chart")
                    $("#trackedCoinsEmptyListTitle").show("slow")
                }
            } else {
                // console.log("Another page")
                stopChart()
            }
        })

        //Nav To Homepage From logo
        $(`#logoAndTextContainer`).click(() => {
            resetSortAndSearch()
            $(`.page`).hide(`fast`)
            $(`.page.homePage`).show(`fast`)
            $('a.navLink').removeClass('selected')
            $('a.navLink[pageName="homePage"]').addClass('selected')
            hideGainersContainer()
            stopChart()
        })

        const getSelectedListBySortOption = async () => {
            const selectedValue = $('#sortBySelectedOption').val()

            console.log("Current Selected Value:", selectedValue)

            let listToSearch = []

            switch (selectedValue) {
                case "default": {
                    listToSearch = await getAllCoins()
                    break
                }

                case "recentCoins": {
                    listToSearch = await getAllRecentCoins()
                    break
                }
                case "tracked": {
                    listToSearch = getTrackedCoinsListFromLocalStorage()
                    break
                }
                default:
            }

            return listToSearch || []
        }

        // HomePage
        //here
        $('#searchButton').click(async () => {

            const newText = $(`#coinSearchInput`).val()

            if (!newText) {
                alert("Please enter a search term")
            }

            const selectedValue = $('#sortBySelectedOption').val()

            console.log("Current Selected Value:", selectedValue)

            let listToSearch = await getSelectedListBySortOption()


            if (!newText) {
                $(`#resetSearchButton`).hide()
            } else {
                $(`#resetSearchButton`).show()
            }

            const trimmedText = newText.trim().toLocaleLowerCase()

            const newList = listToSearch.filter((singleCoin) => {
                const idMatches = singleCoin.id?.toLocaleLowerCase().includes(trimmedText) || false
                const symbolMatches = singleCoin.symbol?.toLocaleLowerCase().includes(trimmedText) || false
                const nameMatches = singleCoin.name?.toLocaleLowerCase().includes(trimmedText) || false
                return idMatches || symbolMatches || nameMatches
            })

            if (newList.length === 0) {
                $(`.allCoinsDiv`).empty()
                $(`#searchNoResultsTitle`).show(`fast`)
                $(`#searchNoResultsTitle`).text("No results found for: " + trimmedText)
            } else {
                $(`#searchNoResultsTitle`).hide(`fast`)
                printCoinsToDom(newList)
            }

            console.log("Search Term:", newText)
            console.log("List To Search:", listToSearch)
            console.log("Search Results:", newList)

        })

        $(`#resetSearchButton`).click(async function () {
            const listToShow = await getSelectedListBySortOption()
            $(`#coinSearchInput`).val(``)
            $(`#searchNoResultsTitle`).hide()
            printCoinsToDom(listToShow)
            $(this).hide()
        })


        $(`#clearSortButton`).click(async function () {
            $(this).hide()
            $(`.gainersContainer`).hide()
            $(`#sortBySelectedOption`).prop(`selectedIndex`, 0)
            $(`#searchNoResultsTitle`).hide()
            hideGainersContainer()
            const allCoins = await getAllCoins()
            printCoinsToDom(allCoins)
        })

        $(`#sortBySelectedOption`).change((event) => {
            const value = $(event.target).val()
            applySelectedSortOption(value)
        })

        // LiveView Page
        $('#removeAllTrackedCoinsButton').click(() => {
            $(`#trackedCoinsDisplay`).children(".coinCardWithToggleButton").each(function (index, elment) {
                const toggle = $(this).find(".tracked-toggle-input")
                toggle.prop('checked', false)
            })

            stopChart()
            $(`.tracked-toggle-input`).prop('checked', false)
            $(`.toggle-input`).prop('checked', false)
            $(`#trackedCoinsContainer`).fadeOut(`slow`)
            $(`#chartContainer`).fadeOut(`slow`)
            $(`#trackedCoinsEmptyListTitle`).show(`slow`)
            $('#reportsPageLoader').hide()
            scrollToTop()

            setTimeout(() => {
                $(`#trackedCoinsDisplay`).empty()
            }, 1000)

            localStorage.removeItem('trackedCoins')
        })

        //About Page Project Details Button
        let currentIndex = 0
        $(`#moveToProjectButton`).click((event) => {
            event.preventDefault()
            console.log("Current Index:", currentIndex)

            if (currentIndex === 0) {
                $(`#moveToProjectButton`).text(`About Me`)
                $(".aboutMeRow").fadeOut(300, function () {
                    // Hide about me
                    $(".aboutMeRow").addClass('d-none')
                    $(".aboutTheProjectContainer").removeClass('d-none').fadeIn(300)
                    scrollToElement(`.page.aboutPage`)
                })
                currentIndex = 1
            } else { // Hide project details
                $(`#moveToProjectButton`).text(`Project Details`)
                $(".aboutTheProjectContainer").fadeOut(300, function () {
                    $(".aboutTheProjectContainer").addClass('d-none')
                    $(".aboutMeRow").removeClass('d-none').fadeIn(300)
                    scrollToTop()
                })
                currentIndex = 0
            }

        })

        // Contact Me Button
        $(`#contactMeButton`).click(() => {
            const email = "mr.dorperez@gmail.com"
            const subject = "Contact Request"
            const body = "Hello, I would like to contact you about..."
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
            window.open(gmailUrl, '_blank')
        })

        // Dark Mode Toggle
        $('#toggleDarkModeButton').click(function () {
            const currentTheme = $('html').attr('userTheme')
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark'

            $('html').attr('userTheme', newTheme)
            localStorage.setItem('userTheme', newTheme)
            handleDarkToggleButton()
        })
    }

    // App Starter
    applyUserTheme()
    const allCoins = await getAllCoins()
    $(`.page.homePage .loader`).fadeIn()
    printCoinsToDom(allCoins)
    setEvents()
    //console.log("All Coins:", allCoins)

})