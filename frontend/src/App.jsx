import React from 'react';
import "./styles/LoginSignUp.css";
import LS_cust from './pages/customer/LS_cust';
import LS_Reps from './pages/agent/LS_Reps';
import Mytickets from "./pages/customer/Mytickets";
import Custhome from "./pages/customer/Custhome";
import Raiseticket from "./pages/customer/Raiseticket";
import ViewTicket from "./pages/customer/ViewTicket";
import CustNoti from "./pages/customer/CustNoti";
import { Routes, Route } from "react-router-dom";
import PrivateRoute from './components/PrivateRoute';
import AgentHome from './pages/agent/AgentHome';
import AgentTickets from "./pages/agent/AgentTickets";
import AgentUnassigned from "./pages/agent/AgentUnassigned";
import AgentPerf from "./pages/agent/AgentPerf";
import Agenthelp from "./pages/agent/Agenthelp";
import AgentNoti from "./pages/agent/AgentNoti";
import AgentTicketView from './pages/agent/AgentTicketView';
import ForgotPwd from './pages/ForgotPwd';
import ResetPwd from "./pages/ResetPwd";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
function App() {
    return (
        <Routes>
            <Route path="/" element={<LS_cust />} />
            <Route path="/agent" element={<LS_Reps />} />
            <Route path="/forgot-pwd" element={<ForgotPwd />} />
            <Route path="/chome" element={
                <PrivateRoute>
                    <Custhome />         // customer home page
                </PrivateRoute>
            } />
            <Route path="/mytickets" element={
                <PrivateRoute>
                    <Mytickets />        //  customer tickets page
                </PrivateRoute>
            } />
            <Route path="/raiseticket" element={
                <PrivateRoute>
                    <Raiseticket />      //  customer raise tickets page
                </PrivateRoute>
            } />
            <Route path="/ticket/:id" element={
                <PrivateRoute>
                    <ViewTicket />       //  customer view tickets page
                </PrivateRoute>
            } />
            <Route path="/cnoti" element={
                <PrivateRoute>
                    <CustNoti />
                </PrivateRoute>
            } />

            //agent pages starts here
            <Route path="/agent/ahome" element={
                <PrivateRoute role='agent'>
                    <AgentHome />        //  agent home page
                </PrivateRoute>
            } />
            <Route path='/agent/agenttickets' element={
                <PrivateRoute role='agent'>
                    <AgentTickets />
                </PrivateRoute>
            }
            />
            <Route path='/agent/unassigned' element={
                <PrivateRoute role='agent'>
                    <AgentUnassigned />
                </PrivateRoute>
            }
            />
            <Route path='/agent/noti' element={
                <PrivateRoute role='agent'>
                    <AgentNoti />
                </PrivateRoute>
            }
            />
            <Route path='/agent/performance' element={
                <PrivateRoute role='agent'>
                    <AgentPerf />
                </PrivateRoute>
            }
            />
            <Route path='/agent/help' element={
                <PrivateRoute role='agent'>
                    <Agenthelp />
                </PrivateRoute>
            }
            />
            <Route path='/agent/agenttickets/:id' element={
                <PrivateRoute role='agent'>
                    <AgentTicketView />
                </PrivateRoute>
            } />

            <Route path="/reset-pwd/:token" element={<ResetPwd/>}/> 

            {/* Manager Routes */}
            <Route path="/manager/dashboard" element={
                <PrivateRoute role='manager'>
                    <ManagerDashboard />
                </PrivateRoute>
            } />

        </Routes>
    );
}
export default App;