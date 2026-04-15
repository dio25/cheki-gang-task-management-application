// App.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Alert, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays, startOfDay } from 'date-fns';

const STORAGE_ENTRIES = 'bizrecord_entries';
const STORAGE_SETTINGS = 'bizrecord_settings';

export default function App() {
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({ businessName: "My Business", currency: "P" });
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Form states
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordType, setRecordType] = useState('income');
  const [recordCategory, setRecordCategory] = useState('');
  const [recordAmount, setRecordAmount] = useState('');
  const [recordDesc, setRecordDesc] = useState('');

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedEntries = await AsyncStorage.getItem(STORAGE_ENTRIES);
      if (savedEntries) setEntries(JSON.parse(savedEntries));

      const savedSettings = await AsyncStorage.getItem(STORAGE_SETTINGS);
      if (savedSettings) setSettings(JSON.parse(savedSettings));
    } catch (e) {
      console.log("Failed to load data");
    }
  };

  const saveEntries = async (newEntries) => {
    try {
      await AsyncStorage.setItem(STORAGE_ENTRIES, JSON.stringify(newEntries));
      setEntries(newEntries);
    } catch (e) {}
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_SETTINGS, JSON.stringify(newSettings));
      setSettings(newSettings);
      alert("✅ Settings saved!");
      setCurrentPage('dashboard');
    } catch (e) {}
  };

  const addRecord = () => {
    if (!recordDate || !recordAmount || parseFloat(recordAmount) <= 0) {
      alert("Please enter a valid date and amount");
      return;
    }

    const newEntry = {
      id: Date.now().toString(),
      date: recordDate,
      type: recordType,
      category: recordCategory || (recordType === 'income' ? 'Sales' : 'Other'),
      amount: parseFloat(recordAmount),
      description: recordDesc || 'No description'
    };

    const updated = [newEntry, ...entries];
    saveEntries(updated);

    // Reset form
    setRecordDate(new Date().toISOString().split('T')[0]);
    setRecordCategory('');
    setRecordAmount('');
    setRecordDesc('');

    alert("✅ Record saved!");
    if (currentPage !== 'records') setCurrentPage('records');
  };

  const deleteRecord = (id) => {
    Alert.alert("Delete?", "Delete this record permanently?", [
      { text: "Cancel" },
      { text: "Delete", onPress: () => {
        const updated = entries.filter(e => e.id !== id);
        saveEntries(updated);
      }}
    ]);
  };

  // Calculations
  const calculateTotals = (filtered) => {
    let income = 0, expense = 0;
    filtered.forEach(e => {
      if (e.type === 'income') income += e.amount;
      else expense += e.amount;
    });
    return { income, expense, profit: income - expense };
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd');

  const todayEntries = entries.filter(e => e.date === todayStr);
  const todayTotals = calculateTotals(todayEntries);

  const weekEntries = entries.filter(e => e.date >= weekStart && e.date <= todayStr);
  const weekTotals = calculateTotals(weekEntries);

  const allTotals = calculateTotals(entries);

  // Filtered records for list
  const filteredRecords = entries.filter(e =>
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render functions
  const renderDashboard = () => (
    <ScrollView className="flex-1 p-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-3xl font-bold">Dashboard</Text>
        <Text className="text-lg font-medium text-emerald-600">{settings.currency} {allTotals.profit.toFixed(2)}</Text>
      </View>

      {/* Today Card */}
      <View className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
        <Text className="text-slate-500 text-sm mb-1">TODAY • {format(new Date(), 'EEEE, dd MMM')}</Text>
        <View className="flex-row justify-between mt-4">
          <View><Text className="text-emerald-600 text-2xl font-semibold">+{settings.currency}{todayTotals.income.toFixed(2)}</Text><Text className="text-slate-500">Income</Text></View>
          <View><Text className="text-red-500 text-2xl font-semibold">-{settings.currency}{todayTotals.expense.toFixed(2)}</Text><Text className="text-slate-500">Expense</Text></View>
        </View>
        <Text className={`text-3xl font-bold mt-6 ${todayTotals.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {settings.currency}{todayTotals.profit.toFixed(2)}
        </Text>
      </View>

      {/* This Week */}
      <View className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
        <Text className="text-slate-500 text-sm mb-1">THIS WEEK</Text>
        <View className="flex-row justify-between mt-4">
          <View><Text className="text-emerald-600 text-2xl font-semibold">+{settings.currency}{weekTotals.income.toFixed(2)}</Text><Text className="text-slate-500">Income</Text></View>
          <View><Text className="text-red-500 text-2xl font-semibold">-{settings.currency}{weekTotals.expense.toFixed(2)}</Text><Text className="text-slate-500">Expense</Text></View>
        </View>
        <Text className={`text-3xl font-bold mt-6 ${weekTotals.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {settings.currency}{weekTotals.profit.toFixed(2)}
        </Text>
      </View>

      {/* Quick Add Button */}
      <TouchableOpacity 
        onPress={() => setCurrentPage('records')}
        className="bg-blue-600 py-4 rounded-3xl mt-6 items-center"
      >
        <Text className="text-white text-xl font-semibold">+ Add Today's Record</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderRecords = () => (
    <View className="flex-1">
      <View className="p-4 bg-white border-b">
        <TextInput
          placeholder="Search records..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          className="bg-slate-100 px-4 py-3 rounded-3xl"
        />
      </View>

      {/* Add Form */}
      <View className="p-4 bg-white border-b">
        <Text className="font-semibold mb-3 text-lg">New Proceeding</Text>
        <TextInput placeholder="Date (YYYY-MM-DD)" value={recordDate} onChangeText={setRecordDate} className="border border-slate-200 p-3 rounded-2xl mb-3" />
        
        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity onPress={() => setRecordType('income')} className={`flex-1 py-3 rounded-2xl ${recordType === 'income' ? 'bg-emerald-600' : 'bg-slate-100'}`}>
            <Text className={`text-center font-medium ${recordType === 'income' ? 'text-white' : ''}`}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRecordType('expense')} className={`flex-1 py-3 rounded-2xl ${recordType === 'expense' ? 'bg-red-600' : 'bg-slate-100'}`}>
            <Text className={`text-center font-medium ${recordType === 'expense' ? 'text-white' : ''}`}>Expense</Text>
          </TouchableOpacity>
        </View>

        <TextInput placeholder="Category (e.g. Sales, Rent)" value={recordCategory} onChangeText={setRecordCategory} className="border border-slate-200 p-3 rounded-2xl mb-3" />
        <TextInput placeholder="Amount" value={recordAmount} onChangeText={setRecordAmount} keyboardType="decimal-pad" className="border border-slate-200 p-3 rounded-2xl mb-3" />
        <TextInput placeholder="Description" value={recordDesc} onChangeText={setRecordDesc} className="border border-slate-200 p-3 rounded-2xl mb-4" />

        <TouchableOpacity onPress={addRecord} className="bg-emerald-600 py-4 rounded-3xl">
          <Text className="text-white text-center font-semibold text-lg">Save Record</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="bg-white mx-4 my-2 p-4 rounded-3xl flex-row justify-between items-center">
            <View>
              <Text className="font-medium">{format(new Date(item.date), 'dd MMM')}</Text>
              <Text className="text-slate-500">{item.description}</Text>
              <Text className="text-xs text-slate-400">{item.category}</Text>
            </View>
            <View className="items-end">
              <Text className={`font-semibold text-lg ${item.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                {item.type === 'income' ? '+' : '-'}{settings.currency}{item.amount.toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => deleteRecord(item.id)}>
                <Text className="text-red-500 text-xl">×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text className="text-center text-slate-400 mt-10">No records yet. Add one above!</Text>}
      />
    </View>
  );

  const renderReports = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayEntries = entries.filter(e => e.date === d);
      const t = calculateTotals(dayEntries);
      days.push({ date: d, ...t });
    }

    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold mb-2">Weekly Summary</Text>
        <Text className="text-emerald-600 text-4xl font-semibold mb-6">{settings.currency}{weekTotals.profit.toFixed(2)}</Text>

        <View className="flex-row flex-wrap justify-between">
          {days.map((day, index) => (
            <View key={index} className="bg-white w-[48%] rounded-3xl p-4 mb-4">
              <Text className="text-xs text-slate-500">{format(new Date(day.date), 'EEE dd')}</Text>
              <Text className="text-emerald-600 font-semibold">+{settings.currency}{day.income.toFixed(0)}</Text>
              <Text className="text-red-500">-{settings.currency}{day.expense.toFixed(0)}</Text>
              <Text className={`font-bold text-xl ${day.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{settings.currency}{day.profit.toFixed(0)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderSettings = () => (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-6">Business Settings</Text>
      
      <Text className="text-slate-500 mb-2">Business Name</Text>
      <TextInput 
        value={settings.businessName} 
        onChangeText={(text) => setSettings({...settings, businessName: text})}
        className="bg-white border border-slate-200 p-4 rounded-3xl mb-6"
      />

      <Text className="text-slate-500 mb-3">Currency</Text>
      <View className="flex-row gap-3">
        {['P', '$', '€'].map(c => (
          <TouchableOpacity 
            key={c}
            onPress={() => setSettings({...settings, currency: c})}
            className={`flex-1 py-4 rounded-3xl border ${settings.currency === c ? 'bg-blue-600 border-blue-600' : 'border-slate-200'}`}
          >
            <Text className={`text-center font-medium ${settings.currency === c ? 'text-white' : ''}`}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        onPress={() => saveSettings(settings)}
        className="bg-blue-600 py-5 rounded-3xl mt-10"
      >
        <Text className="text-white text-center font-semibold text-lg">Save Settings</Text>
      </TouchableOpacity>

      <Text className="text-center text-slate-400 text-xs mt-8">Data is saved locally on your phone</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />
      
      {/* Top Nav */}
      <View className="bg-white px-4 py-3 flex-row justify-between items-center border-b">
        <Text className="text-2xl font-bold text-blue-600">BizRecord</Text>
        <Text className="text-lg font-medium">{settings.businessName}</Text>
      </View>

      {/* Main Content */}
      {currentPage === 'dashboard' && renderDashboard()}
      {currentPage === 'records' && renderRecords()}
      {currentPage === 'reports' && renderReports()}
      {currentPage === 'settings' && renderSettings()}

      {/* Bottom Navigation */}
      <View className="bg-white border-t flex-row justify-around py-2">
        {[
          { label: 'Home', icon: '📊', page: 'dashboard' },
          { label: 'Records', icon: '📝', page: 'records' },
          { label: 'Reports', icon: '📅', page: 'reports' },
          { label: 'Settings', icon: '⚙️', page: 'settings' }
        ].map(item => (
          <TouchableOpacity 
            key={item.page}
            onPress={() => setCurrentPage(item.page)}
            className={`items-center py-2 px-3 rounded-2xl ${currentPage === item.page ? 'bg-blue-100' : ''}`}
          >
            <Text className="text-2xl mb-1">{item.icon}</Text>
            <Text className={`text-xs ${currentPage === item.page ? 'font-semibold text-blue-600' : 'text-slate-500'}`}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}