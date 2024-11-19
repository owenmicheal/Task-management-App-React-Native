import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, Image, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Menu, MenuTrigger, MenuOptions, MenuOption } from 'react-native-popup-menu';
import { format } from 'date-fns';
import Animated, { 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  startDate: string;
  dueDate: string;
}

type SortOption = 'created-asc' | 'created-desc' | 'alpha-asc' | 'alpha-desc';

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = useColorScheme();
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const buttonVisible = useSharedValue(1);
  const [sortOption, setSortOption] = useState<SortOption>('created-desc');

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  const loadTasks = async () => {
    try {
      const tasksJson = await AsyncStorage.getItem('tasks');
      if (tasksJson) {
        setTasks(JSON.parse(tasksJson));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const sortTasks = (tasks: Task[]): Task[] => {
    const sortedTasks = [...tasks];
    switch (sortOption) {
      case 'created-asc':
        return sortedTasks.sort((a, b) => 
          parseInt(a.id) - parseInt(b.id)
        );
      case 'created-desc':
        return sortedTasks.sort((a, b) => 
          parseInt(b.id) - parseInt(a.id)
        );
      case 'alpha-asc':
        return sortedTasks.sort((a, b) => 
          a.title.localeCompare(b.title)
        );
      case 'alpha-desc':
        return sortedTasks.sort((a, b) => 
          b.title.localeCompare(a.title)
        );
      default:
        return sortedTasks;
    }
  };

  const filteredTasks = sortTasks(
    tasks.filter(task => 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleCheckTask = async (taskId: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    );
    setTasks(updatedTasks);
    await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
    
    // Delete task after 5 seconds
    setTimeout(async () => {
      const filteredTasks = tasks.filter(task => task.id !== taskId);
      setTasks(filteredTasks);
      await AsyncStorage.setItem('tasks', JSON.stringify(filteredTasks));
    }, 5000);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const tasksJson = await AsyncStorage.getItem('tasks');
      if (tasksJson) {
        const currentTasks = JSON.parse(tasksJson);
        const updatedTasks = currentTasks.filter((task: Task) => task.id !== taskId);
        await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
        setTasks(updatedTasks); // Update local state immediately
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const deltaY = event.contentOffset.y - lastScrollY.value;
      scrollY.value = event.contentOffset.y;
      
      if (deltaY > 0 && scrollY.value > 20) { // Scrolling down
        buttonVisible.value = withSpring(0);
      } else { // Scrolling up
        buttonVisible.value = withSpring(1);
      }
      
      lastScrollY.value = event.contentOffset.y;
    },
  });

  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonVisible.value }],
      opacity: buttonVisible.value,
    };
  });

  const TaskItem = ({ task }: { task: Task }) => {
    const formatDisplayDate = (dateString: string | null) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return format(date, 'MMM dd');
      } catch {
        return '';
      }
    };

    return (
      <View style={styles.taskItem}>
        <View style={styles.taskHeader}>
          <ThemedText style={styles.taskTitle}>{task.title}</ThemedText>
          <Menu>
            <MenuTrigger>
              <Ionicons name="ellipsis-horizontal" size={24} color="#666666" />
            </MenuTrigger>
            <MenuOptions customStyles={menuOptionsStyles}>
              <MenuOption onSelect={() => router.push(`/edit/${task.id}`)}>
                <View style={styles.menuOption}>
                  <Ionicons name="create-outline" size={24} color="#666666" />
                  <ThemedText style={styles.menuText}>Edit Task</ThemedText>
                </View>
              </MenuOption>
              <MenuOption onSelect={() => handleDeleteTask(task.id)}>
                <View style={[styles.menuOption, styles.deleteOption]}>
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  <ThemedText style={styles.deleteText}>Delete Task</ThemedText>
                </View>
              </MenuOption>
            </MenuOptions>
          </Menu>
        </View>

        <ThemedText style={styles.taskDescription}>{task.description}</ThemedText>

        <View style={styles.dateCard}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.dateText}>
              {formatDisplayDate(task.startDate)} - {formatDisplayDate(task.dueDate)}
            </ThemedText>
          </View>
          <TouchableOpacity 
            style={[styles.checkbox, task.completed && styles.checkboxChecked]}
            onPress={() => handleCheckTask(task.id)}>
            {task.completed && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[
      styles.container, 
      { backgroundColor: colorScheme === 'light' ? '#F2F2F2' : '#000000' }
    ]}>
      <View style={styles.topSection}>
        <View>
          <ThemedText style={styles.greeting}>Hey!</ThemedText>
          <ThemedText style={styles.headerTitle}>Day Class</ThemedText>
        </View>
        <View style={styles.iconContainer}>
          <Menu>
            <MenuTrigger>
              <View style={styles.filterButton}>
                <Ionicons name="filter" size={24} color="#7D2AE8" />
              </View>
            </MenuTrigger>
            <MenuOptions customStyles={filterMenuStyles}>
              <MenuOption onSelect={() => setSortOption('created-desc')}>
                <View style={styles.filterOption}>
                  <Ionicons 
                    name="time-outline" 
                    size={20} 
                    color={sortOption === 'created-desc' ? '#7D2AE8' : '#666666'} 
                  />
                  <ThemedText style={[
                    styles.filterText,
                    sortOption === 'created-desc' && styles.activeFilterText
                  ]}>
                    Newest First
                  </ThemedText>
                </View>
              </MenuOption>
              <MenuOption onSelect={() => setSortOption('created-asc')}>
                <View style={styles.filterOption}>
                  <Ionicons 
                    name="time-outline" 
                    size={20} 
                    color={sortOption === 'created-asc' ? '#7D2AE8' : '#666666'} 
                  />
                  <ThemedText style={[
                    styles.filterText,
                    sortOption === 'created-asc' && styles.activeFilterText
                  ]}>
                    Oldest First
                  </ThemedText>
                </View>
              </MenuOption>
              <MenuOption onSelect={() => setSortOption('alpha-asc')}>
                <View style={styles.filterOption}>
                  <Ionicons 
                    name="text-outline" 
                    size={20} 
                    color={sortOption === 'alpha-asc' ? '#7D2AE8' : '#666666'} 
                  />
                  <ThemedText style={[
                    styles.filterText,
                    sortOption === 'alpha-asc' && styles.activeFilterText
                  ]}>
                    A to Z
                  </ThemedText>
                </View>
              </MenuOption>
              <MenuOption onSelect={() => setSortOption('alpha-desc')}>
                <View style={styles.filterOption}>
                  <Ionicons 
                    name="text-outline" 
                    size={20} 
                    color={sortOption === 'alpha-desc' ? '#7D2AE8' : '#666666'} 
                  />
                  <ThemedText style={[
                    styles.filterText,
                    sortOption === 'alpha-desc' && styles.activeFilterText
                  ]}>
                    Z to A
                  </ThemedText>
                </View>
              </MenuOption>
            </MenuOptions>
          </Menu>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.headerLogo}
          />
        </View>
      </View>

      <View style={styles.motivationalSection}>
        <ThemedText style={styles.motivationalText}>
          Make Your Day{'\n'}So Productive 😎
        </ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666666"
        />
      </View>

      <ThemedText style={styles.tasksTitle}>Tasks</ThemedText>

      <Animated.FlatList
        data={filteredTasks}
        renderItem={({ item }) => <TaskItem task={item} />}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      />
      
      <Animated.View style={[styles.addButtonContainer, buttonStyle]}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/create')}>
          <ThemedText style={styles.addButtonText}>+</ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666666',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '400',
  },
  motivationalSection: {
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 30,
  },
  motivationalText: {
    fontSize: 40,
    fontWeight: '600',
    lineHeight: 48,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 45,
    height: 45,
    borderRadius: 25,
  },
  notificationButton: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  searchIcon: {
    position: 'absolute',
    left: 32,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    paddingLeft: 45,
    borderRadius: 25,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tasksTitle: {
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 10,
    paddingHorizontal: 20,
    color: '#666666',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  taskItem: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minHeight: 160,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 24,
    color: '#000000',
  },
  taskDescription: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    flex: 1,
  },
  dateCard: {
    backgroundColor: '#7D2AE8',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FFFFFF',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  menuText: {
    fontSize: 16,
    color: '#666666',
  },
  deleteText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  addButtonContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7D2AE8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 32,
    color: '#FFFFFF',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  filterText: {
    fontSize: 16,
    color: '#666666',
  },
  activeFilterText: {
    color: '#7D2AE8',
    fontWeight: '600',
  },
});

const menuOptionsStyles = {
  optionsContainer: {
    width: 200,
    borderRadius: 12,
    padding: 0,
    marginTop: 8,
  },
};

const filterMenuStyles = {
  optionsContainer: {
    width: 200,
    borderRadius: 12,
    padding: 0,
    marginTop: 8,
  },
}; 