from helpers import create_xpath, check_available, navigate_to_week_view, navigate_to_next_week, create_driver, wait_for_element
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from bidict import bidict
import time

# Creates a bidirectional dictionary with room numbers and  URLs
booking_sites = bidict(
    {
        "202": "https://libcal.library.harvard.edu/reserve/groupstudy/202?_gl=1*17w4c2z*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDAxOTMuMjUuMC4w",
        "210": "https://libcal.library.harvard.edu/reserve/groupstudy/210?_gl=1*1xla2jr*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDAyMTIuNi4wLjA",
        "211": "https://libcal.library.harvard.edu/reserve/groupstudy/211?_gl=1*y423wi*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDAyNTIuMjkuMC4w",
        "212": "https://libcal.library.harvard.edu/reserve/groupstudy/212?_gl=1*10zuqbc*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDAyNjYuMTUuMC4w",
        "213": "https://libcal.library.harvard.edu/reserve/groupstudy/213?_gl=1*1d69cmo*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDAzMjkuMTkuMC4w",
        "214": "https://libcal.library.harvard.edu/reserve/groupstudy/214?_gl=1*nw0e1y*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDAzNDIuNi4wLjA",
        "LL05": "https://libcal.library.harvard.edu/reserve/groupstudy/LL05?_gl=1*7yuqps*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDAzOTUuMjMuMC4w",
        "LL06": "https://libcal.library.harvard.edu/reserve/groupstudy/LL06?_gl=1*ke3r3i*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDA0MDkuOS4wLjA",
        "LL07": "https://libcal.library.harvard.edu/reserve/groupstudy/LL07?_gl=1*1a4pi8u*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDA0MTkuNTkuMC4w",
        "LL08": "https://libcal.library.harvard.edu/reserve/groupstudy/LL08?_gl=1*t7icaz*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDA0MzMuNDUuMC4w",
        "LL09": "https://libcal.library.harvard.edu/reserve/groupstudy/LL09?_gl=1*n8m22i*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDA0NDQuMzQuMC4w",
        "LL10": "https://libcal.library.harvard.edu/reserve/groupstudy/LL10?_gl=1*1f757ey*_ga*MzQzNjU0NTE5LjE2OTI3MzMxOTQ.*_ga_3CXC97RWEK*MTY5NzUwMDE1OC4xNS4xLjE2OTc1MDA0NTkuMTkuMC4w",
    }
)


def book(first_name, last_name, email_address, start_date, start_time, last_time, room, weeks = 2):
    """
    Books the selected room for the user at their specific date and time


    Args:
        first_name: The first name of the user
        last_name: The last name of thee user
        email_address: The email address of the user
        date: The date of the booking
        start_time: The start time of the booking
        room: The number of selected room
        last_time: The end time of the booking
        weeks: The amount of weeks to iterate through. Max right now is two.


    Returns:
        True if room is successfully booked or another message if not.


    Helpers:
        create_driver: creates the driver instance
        navigate_to_week_view: navigates to week view to view all time slots for the week
        create_xpath: creates xpath for the first slot at the start time of the event
        wait_for_element: ensures selenium does not rush to select the element before its ready
        navigate_to_next_week: if element is not found on this week, go to next week
    """
    # Grabs global dictionary of URLs and room names
    global booking_sites


    # Create driver, retrieve URL, open URL
    driver = create_driver()
    url = booking_sites[room]
    driver.get(url)


    # Clicks on week view (More comprehensive view of availability)
    navigate_to_week_view(driver)


    eventxPath = create_xpath(start_date, start_time, "Available")


    for _ in range(weeks):
        # Wait for the event element to be visible
        wait_for_element(driver, By.CLASS_NAME, "fc-timegrid-event")
        time.sleep(.5)

        # Check if the event element is present
        if driver.find_elements(By.XPATH, eventxPath):


            # Click the available booking
            driver.find_elements(By.XPATH, eventxPath)[0].send_keys(Keys.RETURN)


            # Wait and select the end-time dropdown
            select_element = wait_for_element(driver, By.CSS_SELECTOR, '[id*="bookingend_1"]')
            select_element.send_keys(Keys.RETURN)


            # Select the end time option
            option_elements = select_element.find_elements(By.TAG_NAME, "option")
            for option in option_elements:
                if option.get_attribute("text").split(" ")[0] == last_time:
                    option.click()


            # Submit the reservation time
            wait_for_element(driver, By.ID, "submit_times").send_keys(Keys.RETURN)


            # Agree to terms and continue
            wait_for_element(driver, By.ID, "terms_accept").send_keys(Keys.RETURN)


            # Fill out the user form
            wait_for_element(driver, By.ID, "fname").send_keys(first_name)
            wait_for_element(driver, By.ID, "lname").send_keys(last_name)
            wait_for_element(driver, By.ID, "email").send_keys(email_address)


            # Select user status from dropdown
            user_status_element = wait_for_element(driver, By.ID, "q2061")
            user_status_options = user_status_element.find_elements(By.TAG_NAME, "option")
            for option in user_status_options:
                if "Other" in option.text:
                    option.click()
                    break


            # Select school from dropdown
            school_select_element = wait_for_element(driver, By.ID, "q2048")
            school_select_options = school_select_element.find_elements(By.TAG_NAME, "option")
            for option in school_select_options:
                if "Faculty of Arts and Sciences" in option.text:
                    option.click()
                    break


            # Submit the final booking form
            final_submit_button = wait_for_element(driver, By.ID, "btn-form-submit")
            final_submit_button.send_keys(Keys.TAB)
            final_submit_button.send_keys(Keys.RETURN)


            return "True"
        else:
            # Navigate to the next week if booking is not available
            navigate_to_next_week(driver)


    return "False"


def compile_available(start_date, start_time, end_date, end_time):
    """
    Passes through all sites to the check_available function
    and creates a list of all that are available


    Args:
        start_date: The start date of the calendar event the user made
        start_time: The start time of the calendar event the user made
        end_time: The end time of the calendar event the user made
        end_date: The end date of the calendar event the user made


    Returns:
        A dictionary where the key is results and the value is a
        dictionary of the results
   
    Helpers:
        create_driver: creates driver
        check_available: compiles and returns which URLs have available rooms and the end time of the appropriate booking
    """


    # Grabs global dictionary of URLs and room names
    global booking_sites


    # Initialize an empty list to store results
    results = {}


    # Initialize the web driver
    driver = create_driver()


    # Passes URLs and info to check_available  
    for site in booking_sites.values():
        check_result = check_available(driver, site, start_date, start_time, end_date, end_time)


        # If URL is available, add name of the room to results dictionary alongside the last time it is available
        if not (check_result is None):
            room, last_time = check_result
            results[booking_sites.inverse[room]] = last_time


    # Upon loop completion, quits out of the driver and returns the results
    driver.quit()
    return {"results": results}