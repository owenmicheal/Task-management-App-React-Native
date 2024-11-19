import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Calendar, DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selecting, setSelecting] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    loadTask();
  }, []);

  const formatDisplayDate = (dateString: string | null) => {
    if (!dateString) return 'Select';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Select';
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'Select';
    }
  };

  const loadTask = async () => {
    try {
      const tasksJson = await AsyncStorage.getItem('tasks');
      if (tasksJson) {
        const tasks = JSON.parse(tasksJson);
        const task = tasks.find((t: any) => t.id === id);
        if (task) {
          setTitle(task.title);
          setDescription(task.description);
          if (task.startDate && !isNaN(new Date(task.startDate).getTime())) {
            setStartDate(task.startDate);
          }
          if (task.dueDate && !isNaN(new Date(task.dueDate).getTime())) {
            setEndDate(task.dueDate);
          }
        }
      }
    } catch (error) {
      console.error('Error loading task:', error);
    }
  };

  const handleDateSelect = (date: string) => {
    if (!startDate || selecting === 'start') {
      setStartDate(date);
      setSelecting('end');
    } else if (selecting === 'end' && new Date(date) >= new Date(startDate)) {
      setEndDate(date);
      setSelecting(null);
    }
  };

  const updateTask = async () => {
    try {
      const tasksJson = await AsyncStorage.getItem('tasks');
      if (tasksJson) {
        const tasks = JSON.parse(tasksJson);
        const updatedTasks = tasks.map((task: any) => {
          if (task.id === id) {
            return { 
              ...task, 
              title, 
              description,
              startDate,
              dueDate: endDate,
            };
          }
          return task;
        });
        await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
        router.back();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async () => {
    try {
      const tasksJson = await AsyncStorage.getItem('tasks');
      if (tasksJson) {
        const tasks = JSON.parse(tasksJson);
        const updatedTasks = tasks.filter((task: any) => task.id !== id);
        await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
        router.back();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const markedDates = {
    [startDate]: {
      selected: true,
      startingDay: true,
      color: '#7D2AE8',
    },
    [endDate]: endDate ? {
      selected: true,
      endingDay: true,
      color: '#7D2AE8',
    } : {},
    ...(startDate && endDate ? getDatesInRange(startDate, endDate) : {}),
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={(day: DateData) => handleDateSelect(day.dateString)}
          markedDates={markedDates}
          markingType="period"
          theme={{
            todayTextColor: '#7D2AE8',
            selectedDayBackgroundColor: '#7D2AE8',
            selectedDayTextColor: '#FFFFFF',
          }}
        />
      </View>

      <View style={styles.dateDisplay}>
        <View style={styles.dateItem}>
          <ThemedText style={styles.dateLabel}>Start Date</ThemedText>
          <TouchableOpacity 
            style={[styles.dateButton, selecting === 'start' && styles.dateButtonActive]}
            onPress={() => setSelecting('start')}>
            <Ionicons name="calendar-outline" size={20} color="#666666" />
            <ThemedText style={styles.dateText}>
              {formatDisplayDate(startDate)}
            </ThemedText>
          </TouchableOpacity>
        </View>
        <View style={styles.dateItem}>
          <ThemedText style={styles.dateLabel}>End Date</ThemedText>
          <TouchableOpacity 
            style={[styles.dateButton, selecting === 'end' && styles.dateButtonActive]}
            onPress={() => startDate ? setSelecting('end') : null}>
            <Ionicons name="calendar-outline" size={20} color="#666666" />
            <ThemedText style={styles.dateText}>
              {formatDisplayDate(endDate)}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Task Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Task Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TouchableOpacity 
        style={[
          styles.updateButton,
          (!title || !startDate || !endDate) && styles.buttonDisabled
        ]}
        onPress={updateTask}
        disabled={!title || !startDate || !endDate}>
        <ThemedText style={styles.buttonText}>Update Task</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={deleteTask}>
        <ThemedText style={styles.buttonText}>Delete Task</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

function getDatesInRange(startDate: string, endDate: string) {
  const dates: { [key: string]: { color: string } } = {};
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    const dateString = format(currentDate, 'yyyy-MM-dd');
    if (dateString !== startDate && dateString !== endDate) {
      dates[dateString] = { color: '#B882FF' };
    }
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }
  return dates;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dateDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  dateButtonActive: {
    backgroundColor: '#F0E4FF',
  },
  dateText: {
    fontSize: 14,
    color: '#666666',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  updateButton: {
    backgroundColor: '#7D2AE8',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B882FF',
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 