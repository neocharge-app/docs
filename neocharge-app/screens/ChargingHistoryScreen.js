import React from 'react';
import GraphComponent from "../components/GraphComponent";
import { Alert, View, StyleSheet, TextInput, Text, Button, TouchableOpacity, Dimensions } from 'react-native';
import { API } from 'aws-amplify';
import Colors from '../assets/colors';
import * as SecureStore from 'expo-secure-store';
import WeekGraph from '../components/WeekGraph';

export default class ChargingHistoryScreen extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            userEmail: '',
            priMonthData: new Array(31).fill(0),
            priYearData: new Array(12).fill(0),
            priWeekData: new Array(7).fill(0),
            secMonthData: new Array(31).fill(0),
            secYearData: new Array(12).fill(0),
            secWeekData: new Array(7).fill(0),
            weekHighlight: Colors.accent1,
            monthHighlight: Colors.tabBackground,
            yearHighlight: Colors.tabBackground,
            weekHeaderStr: "",
            monthHeaderStr: "",
            yearHeaderStr: "",
            graphHeaderText: ""

        }
    }


    async componentDidMount() {
        this.state.userEmail = await SecureStore.getItemAsync("secure_email");

        let query = {
            "queryStringParameters": {
                "email": this.state.userEmail
            }
        };

        const path = "/chargehistorytemp";
        console.log("charge logs below:")
        const response = await API.get("LambdaProxy", path, query).catch(error => { console.log(error.response) });
        console.log(response);
        console.log(response);
        console.log(typeof response);
        const todayString = new Date().toISOString().split('T')[0]
        const oneDay = 1000 * 60 * 60 * 24;
        const oneWeek = oneDay * 7;
        const today = Date.parse(todayString);
        const todayObj = new Date();
        const thisYear = todayObj.getFullYear();
        const thisMonth = todayObj.getMonth();

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        this.setWeekHeaderStr(todayObj, monthNames);
        this.setMonthHeaderStr(todayObj, monthNames);
        this.state.yearHeaderStr = thisYear.toString();
        this.state.graphHeaderText = this.state.weekHeaderStr;



        // intialize these so we can put parsed data in them
        // and set state after parsing data
        let priMonth = new Array(31).fill(0);
        let priYear = new Array(12).fill(0);
        let priWeek = new Array(7).fill(0);
        let secMonth = new Array(31).fill(0);
        let secYear = new Array(12).fill(0);
        let secWeek = new Array(7).fill(0);


        if (response != null) {
            response.forEach(obj => {
                const date = Date.parse(obj.startTime.substring(0, 10))
                const dateObj = new Date(obj.startTime.substring(0, 10));
                const year = dateObj.getFullYear();

                console.log(obj);
                let dateCheck = today - date;

                //if charge happened in the last week (including today),
                //then add it to the week data lists
                if (dateCheck <= oneWeek) {
                    priWeek[dateObj.getDay()] = obj.priPower;
                    secWeek[dateObj.getDay()] = obj.secPower;
                }

                let month = dateObj.getMonth()
                //if charge happened in the last month,
                //then add it to the month data lists
                if (month == thisMonth) {
                    priMonth[dateObj.getDate()] = dateObj.priPower;
                    secMonth[dateObj.getDate()] = dateObj.secPower;
                }

                //if charge happened in the last year,
                //then increase the tally of that months charge totals
                if (year == thisYear) {
                    priYear[month] = priYear[month] + obj.priPower;
                    secYear[month] = secYear[month] + obj.secPower;
                }

            }
            )
        }

        this.rotate(priWeek, 7 - (new Date().getDay()));
        this.rotate(secWeek, 7 - (new Date().getDay()));
        this.setState({ priMonthData: priMonth, secMonthData: secMonth, priWeekData: priWeek, secWeekData: secWeek, priYearData: priYear, secYearData: secYear });
        this.forceUpdate();
        console.log(this.state.priWeekData);
        console.log(this.state.secWeekData);

    }

    leapyear(year) {
        return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
    }

    setWeekHeaderStr(todayObj, monthNames) {
        const thisYear = todayObj.getFullYear();
        var monthLengths;
        if (this.leapyear(thisYear)) {
            monthLengths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        } else {
            monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        }
        const thisMonth = todayObj.getMonth();
        const thisMonthStr = monthNames[thisMonth];
        const thisDate = todayObj.getDate();

        //check if beginning of week was in last month
        let firstDate = thisDate - 6;
        if (firstDate < 0) {
            let lastMonth = thisMonth > 0 ? thisMonth - 1 : 11;
            let lastMonthStr = monthNames[lastMonth];
            firstDate = monthLengths[thisMonth-1] + firstDate;
            this.state.weekHeaderStr = lastMonthStr.concat(" ", firstDate, " - ", thisMonthStr, " ", thisDate);
        } else {
            this.state.weekHeaderStr = thisMonthStr.concat(" ", firstDate, " - ", thisMonthStr, " ", thisDate);
        }

    }

    setMonthHeaderStr(todayObj, monthNames) {
        this.state.monthHeaderStr = monthNames[todayObj.getMonth()].concat(" ", todayObj.getFullYear());
    }

    setYearHeaderStr(todayObj) {

    }

    //rotate the array so that 0 index is charge rate from a week ago,
    //and index 6 is charge rate from today
    //if its Tuesday for example, the week graph should display the days in this order...
    //Wed   Thurs   Fri     Sat     Sun     Mon     Tues
    rotate(nums, k) {
        nums.unshift(...nums.splice(nums.length - k));
    };

    weekHandler() {
        this.setState({ weekHighlight: Colors.accent1, monthHighlight: Colors.tabBackground, yearHighlight: Colors.tabBackground, graphHeaderText: this.state.weekHeaderStr });
    }

    monthHandler() {
        this.setState({ weekHighlight: Colors.tabBackground, monthHighlight: Colors.accent1, yearHighlight: Colors.tabBackground, graphHeaderText: this.state.monthHeaderStr });
    }

    yearHandler() {
        this.setState({ weekHighlight: Colors.tabBackground, monthHighlight: Colors.tabBackground, yearHighlight: Colors.accent1, graphHeaderText: this.state.yearHeaderStr });
    }

    render() {
        return (
            <View style={styles.container}>
                <View style={styles.tabs}>
                    <TouchableOpacity onPress={this.weekHandler.bind(this)}>
                        <View style={{ ...styles.tab, backgroundColor: this.state.weekHighlight }}>
                            <Text style={styles.tabText}>Week</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={this.monthHandler.bind(this)}>
                        <View style={{ ...styles.tab, backgroundColor: this.state.monthHighlight }}>
                            <Text style={styles.tabText}>Month</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={this.yearHandler.bind(this)}>
                        <View style={{ ...styles.tab, backgroundColor: this.state.yearHighlight }}>
                            <Text style={styles.tabText}>Year</Text>
                        </View>
                    </TouchableOpacity>

                </View>

                <View style={{ paddingLeft: 10, paddingTop: 20 }}>
                    <Text style={styles.graphHeaderText}>{this.state.graphHeaderText}</Text>
                </View>

                <WeekGraph primary={this.state.priWeekData} secondary={this.state.secWeekData} />
            </View>
        );
    }
}

const width = Dimensions.get('window').width

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.primary,
        flexDirection: 'column',
        width: width,
        alignSelf: 'stretch'
    },
    tabs: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        width: '100%',
        marginTop: 15
    },
    tab: {
        padding: 15,
        borderRadius: 5
    },
    tabText: {
        fontSize: 13,
    },
    graph: {
        flex: 1,
    },
    input: {
        marginTop: 100,
        maxHeight: 40,
        width: '50%',
        borderColor: 'gray',
        borderWidth: 1,
        backgroundColor: Colors.secondary
    },
    timeButtons: {
        flex: 1,
        flexDirection: 'row',
        width: '80%',
        justifyContent: 'space-between'
    },
    button: {
        backgroundColor: 'red',
        height: '20%',
        width: '20%'
    },
    noChargeText: {
        fontSize: 20,
        textAlign: 'center',
        justifyContent: 'center',
        marginHorizontal: '20%',
        marginTop: '15%',
        color: Colors.secondary
    },
    graphHeaderText: {
        fontSize: 25,
        color: Colors.secondary,
        fontWeight: 'bold'
    }

});