from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from datetime import datetime, timedelta
from selenium.webdriver.common.keys import Keys
from selenium import webdriver
import time


def create_driver():
    """ Returns an instance of a Selenium webdriver with the specified options. """
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    return webdriver.Chrome(options=options)


def navigate_to_week_view(driver):
    """ Navigates to the week view in the booking system. """
    week_view_button = driver.find_element(By.CLASS_NAME, "fc-resourceTimeGridWeek-button")
    week_view_button.send_keys(Keys.ENTER)


def navigate_to_next_week(driver):
    """ Navigates to the week view in the booking system. """
    driver.find_element(By.CLASS_NAME, "fc-next-button").send_keys(Keys.ENTER)


def create_xpath(date, times, status):
    """ Create XPaths for the booking slots. """
    return f"//*[contains(@class, 'fc-timegrid-event') and contains(@title, '{date}') and contains(@title, '{times}') and not(contains(@title, '1{times}')) and contains (@title, '{status}')]"


def calculate_end_time(driver, date, times, end_date, end_times, max_tries = 11):
    """ Calculate the end time of the booking based on the lesser of the latest booking time and the user event's end time. """
    xtime = datetime.strptime(f"{date}, {times}", "%B %d, %Y, %I:%M%p")
    end_time = datetime.strptime(f"{end_date}, {end_times}", "%B %d, %Y, %I:%M%p")

    for _ in range(max_tries):  


        # Increment the time by 15 minutes
        xtime += timedelta(minutes = 15)

        # Check if we have reached the end time of the event, breaking if we do
        if xtime == end_time:
            break
       
        # Check to see if it rolls over from Saturday to Sunday (Edge case)
        if xtime.weekday() == 6 and xtime.time() == datetime.strptime("12:00AM", "%I:%M%p").time():
            navigate_to_week_view(driver)


        # Format the xtime
        formatted_date = xtime.strftime('%B %d, %Y').replace(' 0', ' ')
        formatted_time = xtime.strftime(' %I:%M%p').lower().replace(' 0', '').replace(' ', '')


        # Create new xpath to check
        unavailable_xpath = create_xpath(formatted_date, formatted_time, "Unavailable")


        # Check, breaking out of loop if found unavailable (indicating the end of bookable period)
        if driver.find_elements(By.XPATH, unavailable_xpath):
            break


    # Return the minimum between the latest available time and the user's specified end time
    return xtime.strftime(" %I:%M%p").lower().replace(" 0", "").replace(' ', '')


def check_available(driver, site, start_date, start_time, end_date, end_time, weeks = 2):
    """
    Checks whether a room is available given the date and time from the user.


    Args:
        driver: Instance of the selenium chromedriver.
        site: URL of the room booking site.
        start_date, start_time, end_date, end_time: The start and end date/time of the booking.


    Returns:
        URL of the site and the latest available time, if available.
        None, if not available.
    """
    # Navigate to the booking site
    driver.get(site)
   
    navigate_to_week_view(driver)


    # Calculate xpaths for timeslots based on the user event's date and time
    available_time_slot = create_xpath(start_date, start_time, "Available")
    unavailable_time_slot = create_xpath(start_date, start_time, "Unavailable")


    # Loop through the weeks where bookings have been posted (2 max, right now)
    for _ in range(weeks):


        # Wait for the events to load on the calendar
        wait_for_element(driver, By.CLASS_NAME, "fc-timegrid-event")
        time.sleep(0.25)


        if driver.find_elements(By.XPATH, available_time_slot):
            # If found to be available, return the site and the end time
            return site, calculate_end_time(driver, start_date, start_time, end_date, end_time)


        if driver.find_elements(By.XPATH, unavailable_time_slot):
            # If found to be unavailable, return None
            return None
       
        # If not found on this week at all, go to the next week
        navigate_to_next_week(driver)


    # Return None if the room is not available in the two-week period
    return None


def wait_for_element(driver, by, value):
    """ Waits for an element to be visible and returns it."""
    return WebDriverWait(driver, 10).until(EC.visibility_of_element_located((by, value)))